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
import { validarSlot } from "@/lib/booking";

export type ReservaResult = { error?: string };

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

  // Ventana de reserva: desde hoy hasta hoy + bookingWindowDays.
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

  try {
    await prisma.booking.create({
      data: {
        clubId: club.id,
        courtId,
        userId: session.user.id,
        startTime: localToUtc(dateStr, startMinutes, club.timezone),
        endTime: localToUtc(dateStr, endMinutes, club.timezone),
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
