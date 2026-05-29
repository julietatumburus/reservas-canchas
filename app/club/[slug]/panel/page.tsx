import Link from "next/link";
import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import { ArrowRightIcon, CalendarIcon, BoltIcon } from "@/components/icons";

export default async function PanelHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club } = await requireClubAccess(slug);

  const [totalCanchas, activas] = await Promise.all([
    prisma.court.count({ where: { clubId: club.id } }),
    prisma.court.count({ where: { clubId: club.id, active: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Hola, {club.name}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Gestioná tus canchas y horarios desde acá.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Canchas" value={totalCanchas} />
        <Stat label="Canchas activas" value={activas} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/club/${slug}/panel/canchas`}
          className="group flex items-center justify-between rounded-2xl border border-white/8 bg-surface/50 p-5 transition-colors hover:border-brand-400/40"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
              <BoltIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Canchas</p>
              <p className="text-xs text-slate-400">Dar de alta y editar</p>
            </div>
          </div>
          <ArrowRightIcon
            width={18}
            height={18}
            className="text-slate-500 transition-transform group-hover:translate-x-1"
          />
        </Link>

        <Link
          href={`/club/${slug}/panel/reservas`}
          className="group flex items-center justify-between rounded-2xl border border-white/8 bg-surface/50 p-5 transition-colors hover:border-brand-400/40"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-500/15 text-accent-300">
              <CalendarIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Reservas</p>
              <p className="text-xs text-slate-400">Agenda y turnos fijos</p>
            </div>
          </div>
          <ArrowRightIcon
            width={18}
            height={18}
            className="text-slate-500 transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-5">
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}
