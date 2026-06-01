"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClubBySlug } from "@/lib/club";
import {
  localToUtc,
  isValidDateStr,
  todayInTz,
  shiftDate,
  utcToLocalMinutes,
} from "@/lib/availability";
import { minutesToTime, formatCents } from "@/lib/slots";
import { validarSlot } from "@/lib/booking";
import {
  computeDeposit,
  createMpPreference,
  buildWhatsappLink,
} from "@/lib/payments";

export type ReservaResult = {
  error?: string;
  redirectUrl?: string; // MercadoPago checkout
  whatsappLink?: string; // wa.me con mensaje prearmado
  deadlineISO?: string; // vencimiento del comprobante (ISO)
};

export async function crearReservaJugador(
  formData: FormData,
): Promise<ReservaResult> {
  const session = await auth();
  if (!session?.user) return { error: "Tenés que ingresar para reservar." };

  const slug = String(formData.get("slug") ?? "");
  const courtId = String(formData.get("courtId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const startMinutes = Number(formData.get("startMinutes"));
  const endMinutes = Number(formData.get("endMinutes"));

  const club = await getClubBySlug(slug);
  if (!club) return { error: "Club no encontrado." };

  if (!isValidDateStr(dateStr)) return { error: "Fecha inválida." };
  if (
    !Number.isInteger(startMinutes) ||
    !Number.isInteger(endMinutes) ||
    endMinutes <= startMinutes
  ) {
    return { error: "Horario inválido." };
  }

  const today = todayInTz(club.timezone);
  const maxDate = shiftDate(today, club.bookingWindowDays);
  if (dateStr < today) return { error: "No se puede reservar en el pasado." };
  if (dateStr > maxDate) {
    return { error: `Solo se reserva hasta ${club.bookingWindowDays} días en el futuro.` };
  }
  if (dateStr === today) {
    const nowMinutes = utcToLocalMinutes(new Date(), club.timezone);
    if (startMinutes <= nowMinutes) return { error: "Ese turno ya pasó." };
  }

  const court = await prisma.court.findFirst({
    where: { id: courtId, clubId: club.id, active: true },
  });
  if (!court) return { error: "Cancha no encontrada." };

  const { error, priceCents } = await validarSlot(
    club.timezone,
    courtId,
    dateStr,
    startMinutes,
    endMinutes,
  );
  if (error) return { error };

  const startUtc = localToUtc(dateStr, startMinutes, club.timezone);
  const endUtc = localToUtc(dateStr, endMinutes, club.timezone);
  const depositCents = computeDeposit(priceCents, club);

  // Sin seña: confirmar directo.
  if (depositCents <= 0) {
    try {
      await prisma.booking.create({
        data: {
          clubId: club.id,
          courtId,
          userId: session.user.id,
          startTime: startUtc,
          endTime: endUtc,
          status: "CONFIRMED",
          priceCents,
          customerName: session.user.name ?? null,
        },
      });
    } catch {
      return { error: "Ese turno se acaba de ocupar." };
    }
    revalidatePath(`/club/${slug}`);
    return {};
  }

  // Hay seña: elegir método según config del club.
  const mpAvailable = club.mpEnabled && !!process.env.MP_ACCESS_TOKEN;
  const waAvailable = club.whatsappEnabled && !!club.whatsappPhone;

  if (!mpAvailable && !waAvailable) {
    return { error: "El club no tiene un medio de pago configurado para la seña." };
  }

  // Crear el booking PENDING + Payment PENDING (la única variable es el deadline
  // que aplica solo al flujo WhatsApp; en MP no se usa).
  const useWhatsapp = !mpAvailable; // si MP no está, vamos por WhatsApp (si está)
  const proofDeadline = useWhatsapp
    ? new Date(Date.now() + club.proofWindowMinutes * 60_000)
    : null;

  let bookingId: string;
  let paymentId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          clubId: club.id,
          type: "BOOKING",
          status: "PENDING",
          amountCents: depositCents,
          currency: "ARS",
        },
      });
      const booking = await tx.booking.create({
        data: {
          clubId: club.id,
          courtId,
          userId: session.user.id,
          startTime: startUtc,
          endTime: endUtc,
          status: "PENDING",
          priceCents,
          customerName: session.user.name ?? null,
          paymentId: payment.id,
          proofDeadline,
        },
      });
      return { booking, payment };
    });
    bookingId = result.booking.id;
    paymentId = result.payment.id;
  } catch {
    return { error: "Ese turno se acaba de ocupar." };
  }

  // --- Flujo WhatsApp ---
  if (useWhatsapp && club.whatsappPhone) {
    const fechaTxt = `${dateStr} ${minutesToTime(startMinutes)}–${minutesToTime(endMinutes)}`;
    const message =
      `Hola! Reservé en ${club.name} - ${court.name} - ${fechaTxt}. ` +
      `Te envío comprobante de transferencia de la seña (${formatCents(depositCents)}).`;
    const link = buildWhatsappLink(club.whatsappPhone, message);
    revalidatePath(`/club/${slug}`);
    return {
      whatsappLink: link,
      deadlineISO: proofDeadline?.toISOString(),
    };
  }

  // --- Flujo MercadoPago ---
  const baseUrl = process.env.AUTH_URL ?? "";
  const pref = await createMpPreference({
    paymentId,
    amountCents: depositCents,
    description: `Seña ${club.name} · ${dateStr} ${minutesToTime(startMinutes)}`,
    successUrl: `${baseUrl}/mis-turnos`,
    failureUrl: `${baseUrl}/mis-turnos`,
    notificationUrl: `${baseUrl}/api/mp/webhook`,
  });

  if (!pref) {
    // Rollback si MP falló y no había alternativa.
    await prisma.booking.delete({ where: { id: bookingId } }).catch(() => {});
    await prisma.payment.delete({ where: { id: paymentId } }).catch(() => {});
    return { error: "No pudimos generar el cobro con MercadoPago." };
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { mpPreferenceId: pref.preferenceId },
  });

  revalidatePath(`/club/${slug}`);
  return { redirectUrl: pref.initPoint };
}
