"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClubAccess } from "@/lib/club";
import { timeToMinutes } from "@/lib/slots";
import { localToUtc, dateOnlyUtc, isValidDateStr } from "@/lib/availability";
import { validarSlot } from "@/lib/booking";

const SPORTS = ["PADEL", "TENIS", "FUTBOL", "OTRO"] as const;
type Sport = (typeof SPORTS)[number];

export async function crearCancha(formData: FormData) {
  const slug = String(formData.get("slug"));
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const sportRaw = String(formData.get("sport") ?? "PADEL");
  const sport: Sport = (SPORTS as readonly string[]).includes(sportRaw)
    ? (sportRaw as Sport)
    : "PADEL";
  const surface = String(formData.get("surface") ?? "").trim();
  const indoor = formData.get("indoor") === "on";

  if (name.length < 1) return;

  await prisma.court.create({
    data: { clubId: club.id, name, sport, surface: surface || null, indoor },
  });
  revalidatePath(`/club/${slug}/panel/canchas`);
  revalidatePath(`/club/${slug}/panel`);
}

export async function borrarCancha(formData: FormData) {
  const slug = String(formData.get("slug"));
  const courtId = String(formData.get("courtId"));
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  await prisma.court.deleteMany({ where: { id: courtId, clubId: club.id } });
  revalidatePath(`/club/${slug}/panel/canchas`);
  revalidatePath(`/club/${slug}/panel`);
}

export async function toggleCancha(formData: FormData) {
  const slug = String(formData.get("slug"));
  const courtId = String(formData.get("courtId"));
  const active = formData.get("active") === "true";
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  await prisma.court.updateMany({
    where: { id: courtId, clubId: club.id },
    data: { active: !active },
  });
  revalidatePath(`/club/${slug}/panel/canchas`);
}

export async function agregarHorario(formData: FormData) {
  const slug = String(formData.get("slug"));
  const courtId = String(formData.get("courtId"));
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  const court = await prisma.court.findFirst({
    where: { id: courtId, clubId: club.id },
  });
  if (!court) return;

  // Varios días y varias duraciones en una sola carga.
  const dias = formData
    .getAll("dias")
    .map((d) => Number(d))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const duraciones = formData
    .getAll("duraciones")
    .map((d) => Number(d))
    .filter((n) => Number.isInteger(n) && n > 0 && n <= 600);
  const startMinutes = timeToMinutes(String(formData.get("start") ?? ""));
  const endMinutes = timeToMinutes(String(formData.get("end") ?? ""));
  const price = Math.max(0, Math.round(Number(formData.get("price") ?? 0)));

  if (
    dias.length === 0 ||
    duraciones.length === 0 ||
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return;
  }

  const data = dias.flatMap((dayOfWeek) =>
    duraciones.map((slotMinutes) => ({
      courtId,
      dayOfWeek,
      startMinutes,
      endMinutes,
      slotMinutes,
      priceCents: price * 100,
    })),
  );

  await prisma.weeklyAvailability.createMany({ data });
  revalidatePath(`/club/${slug}/panel/canchas/${courtId}`);
}

export async function borrarHorario(formData: FormData) {
  const slug = String(formData.get("slug"));
  const courtId = String(formData.get("courtId"));
  const id = String(formData.get("id"));
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  await prisma.weeklyAvailability.deleteMany({
    where: { id, court: { clubId: club.id } },
  });
  revalidatePath(`/club/${slug}/panel/canchas/${courtId}`);
}

// ---- Ajustes del club -----------------------------------------------------

const DEPOSIT_MODES = ["NONE", "FIXED", "PERCENT"] as const;
type DepositMode = (typeof DEPOSIT_MODES)[number];

export async function actualizarAjustes(formData: FormData) {
  const slug = String(formData.get("slug"));
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  const raw = Math.round(Number(formData.get("bookingWindowDays") ?? 14));
  const bookingWindowDays = Math.min(365, Math.max(1, Number.isFinite(raw) ? raw : 14));

  const modeRaw = String(formData.get("depositMode") ?? "NONE");
  const depositMode: DepositMode = (DEPOSIT_MODES as readonly string[]).includes(modeRaw)
    ? (modeRaw as DepositMode)
    : "NONE";

  // En el form la seña fija se carga en pesos; se persiste en centavos.
  const fixedPesos = Math.max(0, Math.round(Number(formData.get("depositAmount") ?? 0)));
  const depositAmountCents = fixedPesos * 100;
  const depositPercent = Math.min(
    100,
    Math.max(0, Math.round(Number(formData.get("depositPercent") ?? 0))),
  );

  // WhatsApp: solo se persiste si el superadmin lo habilitó para este club.
  const whatsappPhoneRaw = String(formData.get("whatsappPhone") ?? "").trim();
  const whatsappPhone = whatsappPhoneRaw.length > 0 ? whatsappPhoneRaw : null;

  // Ventana del comprobante (minutos): 5..120.
  const proofRaw = Math.round(Number(formData.get("proofWindowMinutes") ?? 15));
  const proofWindowMinutes = Math.min(
    120,
    Math.max(5, Number.isFinite(proofRaw) ? proofRaw : 15),
  );

  await prisma.club.update({
    where: { id: club.id },
    data: {
      bookingWindowDays,
      depositMode,
      depositAmountCents,
      depositPercent,
      whatsappPhone,
      proofWindowMinutes,
    },
  });
  revalidatePath(`/club/${slug}/panel/ajustes`);
}

// ---- Cierres / excepciones (anular turnos en una fecha) -------------------

export async function agregarCierre(formData: FormData) {
  const slug = String(formData.get("slug"));
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  const dateStr = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const scope = String(formData.get("courtId") ?? "all"); // "all" | <courtId>
  const modo = String(formData.get("modo") ?? "dia"); // "dia" | "horas"
  const note = String(formData.get("note") ?? "").trim() || null;

  let startMinutes: number | null = null;
  let endMinutes: number | null = null;
  if (modo === "horas") {
    startMinutes = timeToMinutes(String(formData.get("start") ?? ""));
    endMinutes = timeToMinutes(String(formData.get("end") ?? ""));
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return;
    }
  }

  const courts =
    scope === "all"
      ? await prisma.court.findMany({ where: { clubId: club.id }, select: { id: true } })
      : await prisma.court.findMany({
          where: { id: scope, clubId: club.id },
          select: { id: true },
        });
  if (courts.length === 0) return;

  await prisma.availabilityException.createMany({
    data: courts.map((c) => ({
      courtId: c.id,
      date,
      type: "CLOSED" as const,
      startMinutes,
      endMinutes,
      note,
    })),
  });
  revalidatePath(`/club/${slug}/panel/cierres`);
}

export async function borrarCierre(formData: FormData) {
  const slug = String(formData.get("slug"));
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const { club } = await requireClubAccess(slug, ["OWNER", "ADMIN"]);

  if (ids.length === 0) return;
  await prisma.availabilityException.deleteMany({
    where: { id: { in: ids }, court: { clubId: club.id } },
  });
  revalidatePath(`/club/${slug}/panel/cierres`);
}

// ---- Reservas (agenda del staff) ------------------------------------------

export type ReservaResult = { error?: string };

export async function crearReservaManual(
  formData: FormData,
): Promise<ReservaResult> {
  const slug = String(formData.get("slug"));
  const { club } = await requireClubAccess(slug);

  const courtId = String(formData.get("courtId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const startMinutes = Number(formData.get("startMinutes"));
  const endMinutes = Number(formData.get("endMinutes"));
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const priceCents = Math.max(0, Math.round(Number(formData.get("priceCents") ?? 0)));

  if (!isValidDateStr(dateStr)) return { error: "Fecha inválida." };
  if (
    !Number.isInteger(startMinutes) ||
    !Number.isInteger(endMinutes) ||
    endMinutes <= startMinutes
  ) {
    return { error: "Horario inválido." };
  }
  if (customerName.length < 2) return { error: "Cargá el nombre del cliente." };

  const court = await prisma.court.findFirst({
    where: { id: courtId, clubId: club.id, active: true },
  });
  if (!court) return { error: "Cancha no encontrada." };

  const { error } = await validarSlot(
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
        startTime: localToUtc(dateStr, startMinutes, club.timezone),
        endTime: localToUtc(dateStr, endMinutes, club.timezone),
        status: "CONFIRMED",
        priceCents,
        customerName,
        customerPhone: customerPhone || null,
      },
    });
  } catch {
    return { error: "Ese turno se acaba de ocupar." };
  }

  revalidatePath(`/club/${slug}/panel/reservas`);
  return {};
}

export async function cancelarReserva(formData: FormData) {
  const slug = String(formData.get("slug"));
  const bookingId = String(formData.get("bookingId") ?? "");
  const { club } = await requireClubAccess(slug);

  await prisma.booking.deleteMany({
    where: { id: bookingId, clubId: club.id },
  });
  revalidatePath(`/club/${slug}/panel/reservas`);
}

/** Edita info de una reserva (nombre, teléfono, precio, notas). */
export async function editarReserva(formData: FormData) {
  const slug = String(formData.get("slug"));
  const bookingId = String(formData.get("bookingId") ?? "");
  const { club } = await requireClubAccess(slug);

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhoneRaw = String(formData.get("customerPhone") ?? "").trim();
  const customerPhone = customerPhoneRaw.length > 0 ? customerPhoneRaw : null;
  const pesos = Math.max(0, Math.round(Number(formData.get("price") ?? 0)));
  const priceCents = pesos * 100;
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  if (customerName.length < 2) return;

  await prisma.booking.updateMany({
    where: { id: bookingId, clubId: club.id },
    data: { customerName, customerPhone, priceCents, notes },
  });
  revalidatePath(`/club/${slug}/panel/reservas`);
  revalidatePath(`/club/${slug}/panel/clientes`);
}

/** El staff marca el pago recibido (transferencia/WhatsApp) → CONFIRMED. */
export async function confirmarPagoReserva(formData: FormData) {
  const slug = String(formData.get("slug"));
  const bookingId = String(formData.get("bookingId") ?? "");
  const { club } = await requireClubAccess(slug);

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clubId: club.id },
    select: { id: true, paymentId: true, status: true },
  });
  if (!booking || booking.status !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", proofDeadline: null },
    });
    if (booking.paymentId) {
      await tx.payment.update({
        where: { id: booking.paymentId },
        data: { status: "APPROVED" },
      });
    }
  });
  revalidatePath(`/club/${slug}/panel/reservas`);
}

// ---- Turnos fijos (reservas recurrentes) ----------------------------------

export async function crearTurnoFijo(
  formData: FormData,
): Promise<ReservaResult> {
  const slug = String(formData.get("slug"));
  const { club } = await requireClubAccess(slug);

  const courtId = String(formData.get("courtId") ?? "");
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startMinutes = timeToMinutes(String(formData.get("start") ?? ""));
  const duration = Number(formData.get("duration"));
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const priceCents = Math.max(0, Math.round(Number(formData.get("priceCents") ?? 0)));
  const validFromStr = String(formData.get("validFrom") ?? "");
  const validUntilStr = String(formData.get("validUntil") ?? "").trim();

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "Día inválido." };
  }
  if (startMinutes === null || !Number.isInteger(duration) || duration <= 0) {
    return { error: "Horario inválido." };
  }
  if (customerName.length < 2) return { error: "Cargá el nombre del cliente." };
  if (!isValidDateStr(validFromStr)) return { error: "Fecha de inicio inválida." };
  if (validUntilStr && !isValidDateStr(validUntilStr)) {
    return { error: "Fecha de fin inválida." };
  }

  const court = await prisma.court.findFirst({
    where: { id: courtId, clubId: club.id },
  });
  if (!court) return { error: "Cancha no encontrada." };

  await prisma.recurringBooking.create({
    data: {
      clubId: club.id,
      courtId,
      dayOfWeek,
      startMinutes,
      endMinutes: startMinutes + duration,
      priceCents,
      customerName,
      customerPhone: customerPhone || null,
      validFrom: dateOnlyUtc(validFromStr),
      validUntil: validUntilStr ? dateOnlyUtc(validUntilStr) : null,
    },
  });

  revalidatePath(`/club/${slug}/panel/reservas/fijos`);
  revalidatePath(`/club/${slug}/panel/reservas`);
  return {};
}

export async function borrarTurnoFijo(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id") ?? "");
  const { club } = await requireClubAccess(slug);

  await prisma.recurringBooking.deleteMany({
    where: { id, clubId: club.id },
  });
  revalidatePath(`/club/${slug}/panel/reservas/fijos`);
  revalidatePath(`/club/${slug}/panel/reservas`);
}
