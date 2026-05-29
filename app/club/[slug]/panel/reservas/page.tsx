import Link from "next/link";
import { requireClubAccess } from "@/lib/club";
import { dateOnlyUtc, isValidDateStr, shiftDate, todayInTz } from "@/lib/availability";
import { loadDaySlots } from "@/lib/booking";
import { AgendaGrid } from "@/components/panel/agenda-grid";
import { CalendarIcon } from "@/components/icons";
import { crearReservaManual, cancelarReserva } from "../actions";

const fmtFecha = (dateStr: string) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(dateOnlyUtc(dateStr));

export default async function ReservasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { club, role, isSuperadmin } = await requireClubAccess(slug);
  const canEdit = isSuperadmin || ["OWNER", "ADMIN", "STAFF"].includes(role);

  const sp = await searchParams;
  const today = todayInTz(club.timezone);
  const dateStr = sp.date && isValidDateStr(sp.date) ? sp.date : today;

  const { courts, slotsByCourt } = await loadDaySlots(
    club.id,
    club.timezone,
    dateStr,
  );

  const prev = shiftDate(dateStr, -1);
  const next = shiftDate(dateStr, 1);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reservas</h1>
          <p className="mt-1 text-sm capitalize text-slate-400">{fmtFecha(dateStr)}</p>
        </div>
        <Link
          href="/panel/reservas/fijos"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          <CalendarIcon width={16} height={16} />
          Turnos fijos
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/panel/reservas?date=${prev}`}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          ← Anterior
        </Link>
        <Link
          href="/panel/reservas"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          Hoy
        </Link>
        <Link
          href={`/panel/reservas?date=${next}`}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          Siguiente →
        </Link>
        <form className="ml-auto flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={dateStr}
            className="rounded-lg border border-white/15 bg-surface px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            Ir
          </button>
        </form>
      </div>

      {courts.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
          No tenés canchas activas. Cargá canchas y sus horarios primero.
        </p>
      ) : (
        <AgendaGrid
          slug={slug}
          date={dateStr}
          canEdit={canEdit}
          courts={courts.map((c) => ({ id: c.id, name: c.name }))}
          slotsByCourt={slotsByCourt}
          crearAction={crearReservaManual}
          cancelarAction={cancelarReserva}
        />
      )}
    </div>
  );
}
