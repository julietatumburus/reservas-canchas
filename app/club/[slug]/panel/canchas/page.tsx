import Link from "next/link";
import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";
import { crearCancha, borrarCancha, toggleCancha } from "../actions";

const SPORT_LABEL: Record<string, string> = {
  PADEL: "Padel",
  TENIS: "Tenis",
  FUTBOL: "Fútbol",
  OTRO: "Otro",
};

export default async function CanchasPage({
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
    include: { _count: { select: { availability: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Canchas</h1>
      <p className="mt-1 text-sm text-slate-400">
        Dá de alta tus canchas y entrá a cada una para configurar sus horarios.
      </p>

      {canEdit && (
        <form
          action={crearCancha}
          className="mt-6 rounded-2xl border border-white/8 bg-surface/50 p-5"
        >
          <input type="hidden" name="slug" value={slug} />
          <p className="text-sm font-semibold text-white">Nueva cancha</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              required
              placeholder="Nombre (ej. Cancha 1)"
              className={inputClass}
            />
            <select name="sport" className={inputClass} defaultValue="PADEL">
              <option value="PADEL">Padel</option>
              <option value="TENIS">Tenis</option>
              <option value="FUTBOL">Fútbol</option>
              <option value="OTRO">Otro</option>
            </select>
            <input
              name="surface"
              placeholder="Superficie (ej. césped sintético)"
              className={inputClass}
            />
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-surface px-4 py-3 text-sm text-slate-200">
              <input type="checkbox" name="indoor" className="accent-brand-400" />
              Techada
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-2.5 text-sm font-semibold text-[#06121f]"
          >
            Agregar cancha
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {courts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
            Todavía no cargaste canchas.
          </p>
        )}

        {courts.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-surface/50 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{c.name}</p>
                {!c.active && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                    inactiva
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-400">
                {SPORT_LABEL[c.sport] ?? c.sport}
                {c.surface ? ` · ${c.surface}` : ""}
                {c.indoor ? " · Techada" : ""} · {c._count.availability} horario(s)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/club/${slug}/panel/canchas/${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                <ClockIcon width={16} height={16} />
                Horarios
                <ArrowRightIcon width={15} height={15} />
              </Link>

              {canEdit && (
                <>
                  <form action={toggleCancha}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="courtId" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button
                      type="submit"
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                    >
                      {c.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                  <form action={borrarCancha}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="courtId" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                    >
                      Borrar
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-surface px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";
