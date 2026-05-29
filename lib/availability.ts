// Motor de disponibilidad: convierte fecha local del club + minutos a instantes
// UTC (y viceversa) y calcula el estado de cada slot de una cancha en un día,
// cruzando ventanas semanales, cierres, reservas y turnos fijos.
//
// Toda la lógica de slots trabaja en "minutos desde medianoche" en la zona
// horaria del club; las conversiones a/desde UTC viven acá para no esparcir el
// manejo de timezone por toda la app.

import { minutesToTime } from "@/lib/slots";

// Partes de un instante expresadas en una zona horaria dada.
function zonedParts(instant: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  if (map.hour === 24) map.hour = 0; // algunas plataformas devuelven "24" a medianoche
  return map as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

// Offset (ms) de la zona horaria en ese instante: (hora local) − (hora UTC).
function tzOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - instant.getTime();
}

/** "YYYY-MM-DD" + minutos desde medianoche local → instante UTC. */
export function localToUtc(
  dateStr: string,
  minutes: number,
  timeZone: string,
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naiveUtc = Date.UTC(y, m - 1, d, 0, 0, 0) + minutes * 60_000;
  const offset = tzOffsetMs(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offset);
}

/** Minutos desde medianoche local (en la zona del club) de un instante UTC. */
export function utcToLocalMinutes(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  return p.hour * 60 + p.minute;
}

/** Fecha de hoy ("YYYY-MM-DD") en la zona del club. */
export function todayInTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** Día de la semana (0=Dom..6=Sáb) de una fecha "YYYY-MM-DD" (interpretada como local). */
export function dayOfWeekOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Suma (o resta) días a una fecha "YYYY-MM-DD" y devuelve "YYYY-MM-DD". */
export function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Medianoche UTC de una fecha "YYYY-MM-DD" (para columnas @db.Date). */
export function dateOnlyUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Valida el formato "YYYY-MM-DD". */
export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/** Rango UTC [inicio, fin) que cubre el día local completo. */
export function dayRangeUtc(
  dateStr: string,
  timeZone: string,
): { start: Date; end: Date } {
  return {
    start: localToUtc(dateStr, 0, timeZone),
    end: localToUtc(dateStr, 24 * 60, timeZone),
  };
}

const overlaps = (a1: number, a2: number, b1: number, b2: number) =>
  a1 < b2 && b1 < a2;

export type SlotStatus = "free" | "booked" | "closed";

// Una duración reservable a partir de un mismo horario de inicio.
export type SlotDuration = {
  slotMinutes: number;
  endMinutes: number;
  end: string; // "HH:MM"
  priceCents: number;
};

// Un horario de inicio agrupa las duraciones disponibles (ej. 08:00 → 90 y 120 min).
export type AgendaSlot = {
  startMinutes: number;
  start: string; // "HH:MM"
  status: SlotStatus;
  label?: string; // cliente / motivo del cierre
  bookingId?: string; // presente solo si arranca acá una reserva cancelable
  recurring?: boolean; // ocupado por un turno fijo
  durations: SlotDuration[]; // opciones libres (vacío si no está libre)
};

type Window = {
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  priceCents: number;
};
type Closure = { startMinutes: number | null; endMinutes: number | null };
type Occupancy = { startMinutes: number; endMinutes: number; label: string };

/**
 * Slots de una cancha en un día, agrupados por horario de inicio. Cada inicio
 * lista las duraciones libres (90, 120…). Si no queda ninguna libre, el estado
 * indica por qué: reserva concreta que arranca acá, turno fijo, cierre, u
 * ocupado por una reserva que se solapa desde otro inicio.
 */
export function computeDaySlots(input: {
  windows: Window[];
  closures: Closure[];
  bookings: (Occupancy & { id: string })[];
  recurring: Occupancy[];
}): AgendaSlot[] {
  const { windows, closures, bookings, recurring } = input;

  // Horario de inicio -> duraciones candidatas (según las ventanas configuradas).
  const candidates = new Map<number, SlotDuration[]>();
  for (const w of windows) {
    if (w.slotMinutes <= 0) continue;
    for (let s = w.startMinutes; s + w.slotMinutes <= w.endMinutes; s += w.slotMinutes) {
      const list = candidates.get(s) ?? [];
      if (!list.some((d) => d.slotMinutes === w.slotMinutes)) {
        list.push({
          slotMinutes: w.slotMinutes,
          endMinutes: s + w.slotMinutes,
          end: minutesToTime(s + w.slotMinutes),
          priceCents: w.priceCents,
        });
      }
      candidates.set(s, list);
    }
  }

  const isClosed = (s: number, e: number) =>
    closures.some(
      (c) =>
        c.startMinutes === null ||
        c.endMinutes === null ||
        overlaps(s, e, c.startMinutes, c.endMinutes),
    );
  const bookingOverlap = (s: number, e: number) =>
    bookings.find((b) => overlaps(s, e, b.startMinutes, b.endMinutes));
  const recurringOverlap = (s: number, e: number) =>
    recurring.find((r) => overlaps(s, e, r.startMinutes, r.endMinutes));

  const out: AgendaSlot[] = [];
  for (const [s, durs] of candidates) {
    durs.sort((a, b) => a.slotMinutes - b.slotMinutes);

    const free = durs.filter(
      (d) =>
        !isClosed(s, d.endMinutes) &&
        !bookingOverlap(s, d.endMinutes) &&
        !recurringOverlap(s, d.endMinutes),
    );

    let status: SlotStatus = "free";
    let label: string | undefined;
    let bookingId: string | undefined;
    let isRecurring = false;

    if (free.length === 0) {
      const probeEnd = durs[0].endMinutes; // la duración más corta indica qué lo bloquea
      const own = bookings.find((b) => b.startMinutes === s);
      const fijoAqui = recurring.find((r) => r.startMinutes === s);
      if (own) {
        status = "booked";
        label = own.label;
        bookingId = own.id;
      } else if (fijoAqui) {
        status = "booked";
        label = fijoAqui.label;
        isRecurring = true;
      } else if (isClosed(s, probeEnd)) {
        status = "closed";
      } else {
        status = "booked"; // ocupado por una reserva/fijo que se solapa desde otro inicio
      }
    }

    out.push({
      startMinutes: s,
      start: minutesToTime(s),
      status,
      label,
      bookingId,
      recurring: isRecurring,
      durations: free,
    });
  }

  return out.sort((a, b) => a.startMinutes - b.startMinutes);
}
