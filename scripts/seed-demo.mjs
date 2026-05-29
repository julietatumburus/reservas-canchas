// Siembra un escenario de prueba completo para el club "laquinta":
//   - Cancha 2 y 3 con horarios (antes vacías) → la grilla se ve llena.
//   - Reservas de ejemplo (estado "Ocupado").
//   - Un turno fijo (estado "fijo").
//   - Un cierre parcial (estado "Cerrado").
// Es IDEMPOTENTE: borra lo que sembró antes (ids con prefijo seed_) y las
// ventanas de Cancha 2/3, y vuelve a insertar. No toca Cancha 1 ni otros datos.
//
// Uso:  npm run db:seed
import { Client } from "pg";

const CLUB = "c_laquinta";
const COURT1 = "crt1";
const COURT2 = "cmppubdtc0000w0cwwmy70imy"; // Cancha 2
const COURT3 = "cmppubj2v0001w0cwm7alupk4"; // Cancha 3
const TZ = "America/Argentina/Buenos_Aires";

// --- timezone: misma lógica que lib/availability.ts (local AR -> instante UTC) ---
function zonedParts(instant, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const m = {};
  for (const p of dtf.formatToParts(instant)) if (p.type !== "literal") m[p.type] = Number(p.value);
  if (m.hour === 24) m.hour = 0;
  return m;
}
function tzOffsetMs(instant, tz) {
  const p = zonedParts(instant, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - instant.getTime();
}
function localToUtc(dateStr, minutes, tz) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, 0, 0) + minutes * 60000;
  return new Date(naive - tzOffsetMs(new Date(naive), tz));
}
function todayInTz(tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}
function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function dowOf(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
// Booking.startTime/endTime son `timestamp` SIN zona: Prisma los lee como UTC.
// Pasamos el wall-clock UTC como string para que node-postgres no lo corra con
// la zona local del proceso (lo que desincronizaría con la lectura de Prisma).
function utcStamp(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

const c = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await c.connect();
  const today = todayInTz(TZ);
  const tomorrow = shiftDate(today, 1);
  const dow = dowOf(today);

  // 1) Limpiar lo sembrado antes
  await c.query(`delete from "WeeklyAvailability" where "courtId" = any($1)`, [[COURT2, COURT3]]);
  await c.query(`delete from "Booking" where id like 'seed\\_%'`);
  await c.query(`delete from "RecurringBooking" where id like 'seed\\_%'`);
  await c.query(`delete from "AvailabilityException" where id like 'seed\\_%'`);

  // 2) Horarios todos los días para Cancha 2 (60', $50.000) y Cancha 3 (90', $70.000)
  const wins = [];
  for (let d = 0; d <= 6; d++) {
    wins.push([`seed_w2_${d}`, COURT2, d, 480, 1380, 60, 5000000]);   // 08:00–23:00
    wins.push([`seed_w3_${d}`, COURT3, d, 540, 1380, 90, 7000000]);   // 09:00–23:00
  }
  for (const w of wins) {
    await c.query(
      `insert into "WeeklyAvailability"(id,"courtId","dayOfWeek","startMinutes","endMinutes","slotMinutes","priceCents") values($1,$2,$3,$4,$5,$6,$7)`,
      w,
    );
  }

  // 3) Reservas de ejemplo HOY (estado "Ocupado"). Starts alineados a slots reales.
  const bookings = [
    // Cancha 1 hoy 20:00–21:30 (90')
    ["seed_bk1", COURT1, today, 1200, 1290, 9000000, "Carlos Gómez", "11 4444 1111"],
    // Cancha 2 hoy 19:00–20:00 (60')
    ["seed_bk2", COURT2, today, 1140, 1200, 5000000, "Lucía Pérez", "11 4444 2222"],
    // Cancha 2 mañana 18:00–19:00
    ["seed_bk3", COURT2, tomorrow, 1080, 1140, 5000000, "Pedro Díaz", null],
  ];
  for (const [id, court, date, sm, em, price, name, phone] of bookings) {
    await c.query(
      `insert into "Booking"(id,"clubId","courtId","startTime","endTime",status,"priceCents",currency,"customerName","customerPhone","createdAt","updatedAt")
       values($1,$2,$3,$4,$5,'CONFIRMED',$6,'ARS',$7,$8,now(),now())`,
      [id, CLUB, court, utcStamp(localToUtc(date, sm, TZ)), utcStamp(localToUtc(date, em, TZ)), price, name, phone],
    );
  }

  // 4) Turno fijo en Cancha 1, mismo día de semana que hoy, 18:30–20:00 (90')
  // validFrom/validUntil son @db.Date: pasar el string YYYY-MM-DD (no un Date,
  // que node-postgres truncaría con la zona local del proceso y correría el día).
  await c.query(
    `insert into "RecurringBooking"(id,"clubId","courtId","dayOfWeek","startMinutes","endMinutes","priceCents","customerName","customerPhone",notes,"validFrom","validUntil",active,"createdAt","updatedAt")
     values($1,$2,$3,$4,1110,1200,9000000,$5,'11 4444 3333',null,$6,null,true,now(),now())`,
    ["seed_rb1", CLUB, COURT1, dow, "Grupo de los amigos", today],
  );

  // 5) Cierre parcial HOY en Cancha 3 (12:00–16:00) → estado "Cerrado"
  await c.query(
    `insert into "AvailabilityException"(id,"courtId",date,type,"startMinutes","endMinutes",note)
     values($1,$2,$3,'CLOSED',720,960,'Mantenimiento')`,
    ["seed_ex1", COURT3, today],
  );

  console.log("✓ Seed listo para el club 'laquinta'");
  console.log(`  Fecha de hoy (AR): ${today}  ·  mañana: ${tomorrow}`);
  console.log("  Cancha 2 y 3 ahora tienen horarios (antes vacías).");
  console.log("  Reservas de ejemplo: Cancha 1 hoy 20:00, Cancha 2 hoy 19:00 y mañana 18:00.");
  console.log("  Turno fijo: Cancha 1 hoy 18:30 (Grupo de los amigos).");
  console.log("  Cierre: Cancha 3 hoy 12:00–16:00 (Mantenimiento).");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => c.end());
