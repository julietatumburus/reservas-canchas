export const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function timeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Slots concretos a partir de una ventana horaria. */
export function generateSlots(
  startMinutes: number,
  endMinutes: number,
  slotMinutes: number,
): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  if (slotMinutes <= 0) return out;
  for (let s = startMinutes; s + slotMinutes <= endMinutes; s += slotMinutes) {
    out.push({ start: minutesToTime(s), end: minutesToTime(s + slotMinutes) });
  }
  return out;
}

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatCents(cents: number): string {
  return ARS.format(cents / 100);
}
