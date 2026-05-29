import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import { minutesToTime } from "@/lib/slots";
import { agregarCierre, borrarCierre } from "../actions";

const fmtFecha = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(d);

export default async function CierresPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club, role, isSuperadmin } = await requireClubAccess(slug);
  const canEdit = isSuperadmin || role === "OWNER" || role === "ADMIN";

  const courts = await prisma.court.findMany({
    where: { clubId: club.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: club.timezone,
  }).format(new Date());
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const exceptions = await prisma.availabilityException.findMany({
    where: { court: { clubId: club.id }, date: { gte: todayDate } },
    include: { court: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
  });

  // Agrupar cierres idénticos (misma fecha/horario/nota) que abarcan varias canchas.
  type Group = {
    ids: string[];
    date: Date;
    startMinutes: number | null;
    endMinutes: number | null;
    note: string | null;
    courtNames: string[];
  };
  const groups = new Map<string, Group>();
  for (const e of exceptions) {
    const key = `${e.date.toISOString()}|${e.startMinutes}|${e.endMinutes}|${e.note ?? ""}`;
    const g = groups.get(key);
    if (g) {
      g.ids.push(e.id);
      g.courtNames.push(e.court.name);
    } else {
      groups.set(key, {
        ids: [e.id],
        date: e.date,
        startMinutes: e.startMinutes,
        endMinutes: e.endMinutes,
        note: e.note,
        courtNames: [e.court.name],
      });
    }
  }
  const grouped = [...groups.values()];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Cierres</h1>
      <p className="mt-1 text-sm text-slate-400">
        Anulá turnos en una fecha puntual: todo el día, medio día o por horas.
        Pisa los horarios semanales solo para esa fecha.
      </p>

      {canEdit && (
        <>
          <form action={agregarCierre} className="mt-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="date" value={todayStr} />
            <input type="hidden" name="courtId" value="all" />
            <input type="hidden" name="modo" value="dia" />
            <button
              type="submit"
              className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/15"
            >
              Cerrar hoy (todas las canchas)
            </button>
          </form>

          <form
            action={agregarCierre}
            className="mt-4 space-y-4 rounded-2xl border border-white/8 bg-surface/50 p-5"
          >
            <input type="hidden" name="slug" value={slug} />
            <p className="text-sm font-semibold text-white">Nuevo cierre</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Fecha
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={todayStr}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Cancha
                <select name="courtId" className={inputClass} defaultValue="all">
                  <option value="all">Todas las canchas</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Alcance
                <select name="modo" className={inputClass} defaultValue="dia">
                  <option value="dia">Todo el día</option>
                  <option value="horas">Por horas</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Nota (opcional)
                <input
                  name="note"
                  placeholder="Feriado, mantenimiento…"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Desde (si es por horas)
                <input type="time" name="start" defaultValue="08:00" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Hasta (si es por horas)
                <input type="time" name="end" defaultValue="14:00" className={inputClass} />
              </label>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-2.5 text-sm font-semibold text-[#06121f]"
            >
              Agregar cierre
            </button>
          </form>
        </>
      )}

      <div className="mt-6 space-y-3">
        {grouped.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
            No hay cierres próximos.
          </p>
        )}

        {grouped.map((g) => {
          const todas = g.courtNames.length === courts.length && courts.length > 0;
          return (
            <div
              key={g.ids.join(",")}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-surface/50 p-5"
            >
              <div>
                <p className="font-semibold capitalize text-white">
                  {fmtFecha(g.date)}
                  <span className="ml-2 font-normal text-slate-400">
                    {g.startMinutes !== null && g.endMinutes !== null
                      ? `${minutesToTime(g.startMinutes)}–${minutesToTime(g.endMinutes)}`
                      : "todo el día"}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {todas ? "Todas las canchas" : g.courtNames.join(", ")}
                  {g.note ? ` · ${g.note}` : ""}
                </p>
              </div>
              {canEdit && (
                <form action={borrarCierre}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="ids" value={g.ids.join(",")} />
                  <button
                    type="submit"
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                  >
                    Reabrir
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-surface px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";
