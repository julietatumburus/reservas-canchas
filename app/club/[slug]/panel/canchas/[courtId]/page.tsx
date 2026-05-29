import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import { DAYS, minutesToTime, generateSlots, formatCents } from "@/lib/slots";
import { ArrowRightIcon } from "@/components/icons";
import { agregarHorario, borrarHorario } from "../../actions";

// Días en orden Lun..Dom para la UI (los valores son 0=Dom..6=Sáb).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};
const DURACIONES = [60, 90, 120];

export default async function HorariosPage({
  params,
}: {
  params: Promise<{ slug: string; courtId: string }>;
}) {
  const { slug, courtId } = await params;
  const { club, role, isSuperadmin } = await requireClubAccess(slug);
  const canEdit = isSuperadmin || role === "OWNER" || role === "ADMIN";

  const court = await prisma.court.findFirst({
    where: { id: courtId, clubId: club.id },
    include: {
      availability: { orderBy: [{ startMinutes: "asc" }, { slotMinutes: "asc" }] },
    },
  });
  if (!court) notFound();

  return (
    <div>
      <Link href="/panel/canchas" className="text-sm text-slate-400 hover:text-white">
        ← Canchas
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
        Horarios · {court.name}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Elegí los días, el rango horario, las duraciones de turno y el precio. Se
        crea una ventana por cada día y duración; los turnos se generan solos.
      </p>

      {canEdit && (
        <form
          action={agregarHorario}
          className="mt-6 space-y-4 rounded-2xl border border-white/8 bg-surface/50 p-5"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="courtId" value={court.id} />
          <p className="text-sm font-semibold text-white">Nueva ventana</p>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-400">
              Días
            </span>
            <div className="flex flex-wrap gap-2">
              {DAY_ORDER.map((d) => (
                <label
                  key={d}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-surface px-3 py-2 text-sm text-slate-200 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-500/15"
                >
                  <input
                    type="checkbox"
                    name="dias"
                    value={d}
                    defaultChecked={d >= 1 && d <= 5}
                    className="accent-brand-400"
                  />
                  {DAY_SHORT[d]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Desde
              <input type="time" name="start" required defaultValue="08:00" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Hasta
              <input type="time" name="end" required defaultValue="23:00" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Precio ($)
              <input type="number" name="price" min={0} step={500} defaultValue={0} className={inputClass} />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-400">
              Duraciones de turno (min)
            </span>
            <div className="flex flex-wrap gap-2">
              {DURACIONES.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-surface px-3 py-2 text-sm text-slate-200 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-500/15"
                >
                  <input
                    type="checkbox"
                    name="duraciones"
                    value={m}
                    defaultChecked={m === 90}
                    className="accent-brand-400"
                  />
                  {m}′
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Si las de 90 y 120 tienen distinto precio, cargalas por separado.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-2.5 text-sm font-semibold text-[#06121f]"
          >
            Agregar ventana
            <ArrowRightIcon width={16} height={16} />
          </button>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {court.availability.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
            Sin horarios cargados todavía.
          </p>
        )}

        {DAY_ORDER.map((day) => {
          const items = court.availability.filter((a) => a.dayOfWeek === day);
          if (items.length === 0) return null;
          return (
            <div key={day} className="rounded-2xl border border-white/8 bg-surface/50 p-5">
              <p className="font-semibold text-white">{DAYS[day]}</p>
              <div className="mt-3 space-y-3">
                {items.map((a) => {
                  const slots = generateSlots(a.startMinutes, a.endMinutes, a.slotMinutes);
                  return (
                    <div key={a.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-200">
                          {minutesToTime(a.startMinutes)}–{minutesToTime(a.endMinutes)} ·{" "}
                          <span className="text-brand-300">turnos de {a.slotMinutes}′</span> ·{" "}
                          {a.priceCents > 0 ? formatCents(a.priceCents) : "sin precio"} ·{" "}
                          {slots.length} turno(s)
                        </p>
                        {canEdit && (
                          <form action={borrarHorario}>
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="courtId" value={court.id} />
                            <input type="hidden" name="id" value={a.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                            >
                              Borrar
                            </button>
                          </form>
                        )}
                      </div>
                      {slots.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {slots.map((s) => (
                            <span
                              key={s.start}
                              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-slate-300"
                            >
                              {s.start}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-surface px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";
