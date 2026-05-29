import { prisma } from "@/lib/prisma";
import {
  computeDaySlots,
  dayOfWeekOf,
  dayRangeUtc,
  dateOnlyUtc,
  utcToLocalMinutes,
  type AgendaSlot,
} from "@/lib/availability";

export type AgendaCourt = { id: string; name: string; sport: string };

/**
 * Carga las canchas activas del club y calcula los slots de cada una para una
 * fecha. Usado por la agenda del panel y por la grilla pública del jugador.
 */
export async function loadDaySlots(
  clubId: string,
  timezone: string,
  dateStr: string,
): Promise<{ courts: AgendaCourt[]; slotsByCourt: Record<string, AgendaSlot[]> }> {
  const dow = dayOfWeekOf(dateStr);
  const dateUtc = dateOnlyUtc(dateStr);
  const { start: dayStart, end: dayEnd } = dayRangeUtc(dateStr, timezone);

  const courts = await prisma.court.findMany({
    where: { clubId, active: true },
    orderBy: { createdAt: "asc" },
    include: { availability: { where: { dayOfWeek: dow } } },
  });
  const courtIds = courts.map((c) => c.id);

  const [closures, bookings, recurring] = await Promise.all([
    prisma.availabilityException.findMany({
      where: { courtId: { in: courtIds }, date: dateUtc, type: "CLOSED" },
    }),
    prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        status: { not: "CANCELLED" },
        startTime: { gte: dayStart, lt: dayEnd },
      },
      include: { user: { select: { name: true } } },
    }),
    prisma.recurringBooking.findMany({
      where: {
        courtId: { in: courtIds },
        dayOfWeek: dow,
        active: true,
        validFrom: { lte: dateUtc },
        OR: [{ validUntil: null }, { validUntil: { gte: dateUtc } }],
      },
    }),
  ]);

  const slotsByCourt: Record<string, AgendaSlot[]> = {};
  for (const court of courts) {
    slotsByCourt[court.id] = computeDaySlots({
      windows: court.availability.map((w) => ({
        startMinutes: w.startMinutes,
        endMinutes: w.endMinutes,
        slotMinutes: w.slotMinutes,
        priceCents: w.priceCents,
      })),
      closures: closures
        .filter((c) => c.courtId === court.id)
        .map((c) => ({ startMinutes: c.startMinutes, endMinutes: c.endMinutes })),
      bookings: bookings
        .filter((b) => b.courtId === court.id)
        .map((b) => ({
          id: b.id,
          startMinutes: utcToLocalMinutes(b.startTime, timezone),
          endMinutes: utcToLocalMinutes(b.endTime, timezone),
          label: b.customerName ?? b.user?.name ?? "Reservado",
        })),
      recurring: recurring
        .filter((r) => r.courtId === court.id)
        .map((r) => ({
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
          label: `${r.customerName} (fijo)`,
        })),
    });
  }

  return {
    courts: courts.map((c) => ({ id: c.id, name: c.name, sport: c.sport })),
    slotsByCourt,
  };
}

/**
 * Verifica que [startMinutes, endMinutes) sea reservable en esa cancha/fecha:
 * cae dentro de una ventana semanal, no está cerrado, y no se pisa con otra
 * reserva o turno fijo vigente.
 *
 * Devuelve `error` (mensaje) o null si está OK, y el `priceCents` de la ventana
 * que lo contiene (0 si no hay precio o no aplica).
 */
export async function validarSlot(
  timezone: string,
  courtId: string,
  dateStr: string,
  startMinutes: number,
  endMinutes: number,
): Promise<{ error: string | null; priceCents: number }> {
  const dow = dayOfWeekOf(dateStr);

  const ventana = await prisma.weeklyAvailability.findFirst({
    where: {
      courtId,
      dayOfWeek: dow,
      startMinutes: { lte: startMinutes },
      endMinutes: { gte: endMinutes },
    },
    orderBy: { priceCents: "desc" },
  });
  if (!ventana) {
    return { error: "Ese horario no está disponible para esta cancha.", priceCents: 0 };
  }

  const dateUtc = dateOnlyUtc(dateStr);
  const cierres = await prisma.availabilityException.findMany({
    where: { courtId, date: dateUtc, type: "CLOSED" },
  });
  const cerrado = cierres.some(
    (c) =>
      c.startMinutes === null ||
      c.endMinutes === null ||
      (startMinutes < c.endMinutes && c.startMinutes < endMinutes),
  );
  if (cerrado) {
    return { error: "La cancha está cerrada en ese horario.", priceCents: ventana.priceCents };
  }

  const { start, end } = dayRangeUtc(dateStr, timezone);
  const reservas = await prisma.booking.findMany({
    where: { courtId, status: { not: "CANCELLED" }, startTime: { gte: start, lt: end } },
    select: { startTime: true, endTime: true },
  });
  const pisada = reservas.some((b) => {
    const bs = utcToLocalMinutes(b.startTime, timezone);
    const be = utcToLocalMinutes(b.endTime, timezone);
    return startMinutes < be && bs < endMinutes;
  });
  if (pisada) {
    return { error: "Ya hay una reserva en ese horario.", priceCents: ventana.priceCents };
  }

  const fijos = await prisma.recurringBooking.findMany({
    where: {
      courtId,
      dayOfWeek: dow,
      active: true,
      validFrom: { lte: dateUtc },
      OR: [{ validUntil: null }, { validUntil: { gte: dateUtc } }],
    },
    select: { startMinutes: true, endMinutes: true },
  });
  const pisaFijo = fijos.some(
    (f) => startMinutes < f.endMinutes && f.startMinutes < endMinutes,
  );
  if (pisaFijo) {
    return { error: "Hay un turno fijo en ese horario.", priceCents: ventana.priceCents };
  }

  return { error: null, priceCents: ventana.priceCents };
}
