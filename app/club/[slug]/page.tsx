import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { ArrowRightIcon } from "@/components/icons";
import { BookingGrid } from "@/components/club/booking-grid";
import { auth } from "@/lib/auth";
import { getClubBySlug, getMembership } from "@/lib/club";
import { clubUrl } from "@/lib/tenant";
import {
  dateOnlyUtc,
  isValidDateStr,
  shiftDate,
  todayInTz,
} from "@/lib/availability";
import { loadDaySlots } from "@/lib/booking";
import { crearReservaJugador } from "./actions";

const SPORT_LABEL: Record<string, string> = {
  PADEL: "Padel",
  TENIS: "Tenis",
  FUTBOL: "Fútbol",
  OTRO: "Otro",
};

const fmtFecha = (dateStr: string) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(dateOnlyUtc(dateStr));

// Página pública del club (servida por subdominio, reescrita por proxy.ts):
// grilla de turnos donde el jugador logueado reserva su cancha.
export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; sport?: string }>;
}) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) notFound();

  const session = await auth();
  const isLoggedIn = !!session?.user;
  let canManage = false;
  if (session?.user) {
    if (session.user.role === "SUPERADMIN") {
      canManage = true;
    } else {
      const membership = await getMembership(session.user.id, club.id);
      canManage = !!membership;
    }
  }

  const sp = await searchParams;
  const today = todayInTz(club.timezone);
  const maxDate = shiftDate(today, club.bookingWindowDays);
  let dateStr = sp.date && isValidDateStr(sp.date) ? sp.date : today;
  if (dateStr < today) dateStr = today;
  if (dateStr > maxDate) dateStr = maxDate;

  const { courts, slotsByCourt } = await loadDaySlots(club.id, club.timezone, dateStr);

  // Filtro por deporte (tabs): solo se muestra si el club tiene varios deportes.
  const ALLOWED_SPORTS = ["PADEL", "TENIS", "FUTBOL", "OTRO"] as const;
  const sportFilter =
    sp.sport && (ALLOWED_SPORTS as readonly string[]).includes(sp.sport)
      ? sp.sport
      : null;
  const clubSports = Array.from(new Set(courts.map((c) => c.sport)));
  const filteredCourts = sportFilter
    ? courts.filter((c) => c.sport === sportFilter)
    : courts;
  const sportQs = sportFilter ? `&sport=${sportFilter}` : "";

  // No filtrar nombres de otros clientes hacia el público: solo estado/horario/precio.
  const publicSlots: typeof slotsByCourt = {};
  for (const [courtId, slots] of Object.entries(slotsByCourt)) {
    publicSlots[courtId] = slots.map((s) => ({
      ...s,
      label: undefined,
      bookingId: undefined,
    }));
  }

  const prev = shiftDate(dateStr, -1);
  const next = shiftDate(dateStr, 1);
  const canPrev = dateStr > today;
  const canNext = dateStr < maxDate;

  return (
    <div className="bg-grid flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
        <Logo href="/" />
        {canManage ? (
          <Link
            href={`/club/${slug}/panel`}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-400 to-accent-400 px-4 py-2 text-sm font-semibold text-[#06121f]"
          >
            Ir al panel
            <ArrowRightIcon width={16} height={16} />
          </Link>
        ) : isLoggedIn ? (
          <Link
            href="/mis-turnos"
            className="text-sm font-medium text-slate-200 hover:text-white"
          >
            Mis turnos
          </Link>
        ) : (
          <Link
            href="/ingresar"
            className="text-sm font-medium text-slate-200 hover:text-white"
          >
            Ingresar
          </Link>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {club.name}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Reservá tu turno. Elegí el día y tocá un horario disponible.
        </p>

        {!isLoggedIn && (
          <p className="mt-4 rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-100">
            <Link href="/ingresar" className="font-semibold underline">
              Ingresá
            </Link>{" "}
            para reservar un turno.
          </p>
        )}

        {clubSports.length > 1 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={`/club/${slug}?date=${dateStr}`}
              className={[
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                !sportFilter
                  ? "border border-brand-400/40 bg-brand-500/15 text-brand-200"
                  : "border border-white/15 text-slate-300 hover:bg-white/5",
              ].join(" ")}
            >
              Todos
            </Link>
            {clubSports.map((s) => (
              <Link
                key={s}
                href={`/club/${slug}?date=${dateStr}&sport=${s}`}
                className={[
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  sportFilter === s
                    ? "border border-brand-400/40 bg-brand-500/15 text-brand-200"
                    : "border border-white/15 text-slate-300 hover:bg-white/5",
                ].join(" ")}
              >
                {SPORT_LABEL[s] ?? s}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {canPrev ? (
            <Link
              href={`/club/${slug}?date=${prev}${sportQs}`}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-lg border border-white/8 px-3 py-2 text-sm text-slate-600">
              ← Anterior
            </span>
          )}
          <span className="rounded-lg bg-white/5 px-3 py-2 text-sm capitalize text-white">
            {fmtFecha(dateStr)}
          </span>
          {canNext ? (
            <Link
              href={`/club/${slug}?date=${next}${sportQs}`}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="rounded-lg border border-white/8 px-3 py-2 text-sm text-slate-600">
              Siguiente →
            </span>
          )}
        </div>

        {courts.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-10 text-center text-sm text-slate-400">
            Este club todavía no tiene canchas disponibles.
          </p>
        ) : (
          <BookingGrid
            slug={slug}
            date={dateStr}
            isLoggedIn={isLoggedIn}
            clubBaseUrl={clubUrl(slug)}
            courts={filteredCourts}
            slotsByCourt={publicSlots}
            crearAction={crearReservaJugador}
          />
        )}
      </main>

      <footer className="py-8 text-center text-xs text-slate-600">
        Potenciado por Saque
      </footer>
    </div>
  );
}
