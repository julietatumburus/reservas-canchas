import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clubUrl } from "@/lib/tenant";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  asignarMiembro,
  quitarMiembro,
  cambiarEstadoSuscripcion,
} from "../../actions";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Admin",
  STAFF: "Empleado",
};

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSuperadmin();

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { courts: true } },
    },
  });
  if (!club) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Clubes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {club.name}
          </h1>
          <StatusBadge status={club.subscriptionStatus} />
        </div>
        <a
          href={clubUrl(club.slug)}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand-300 hover:underline"
        >
          {clubUrl(club.slug)}
        </a>
        <p className="mt-1 text-sm text-slate-400">{club._count.courts} cancha(s)</p>
      </div>

      {/* Suscripción */}
      <section className="rounded-2xl border border-white/8 bg-surface/50 p-5">
        <p className="text-sm font-semibold text-white">Suscripción</p>
        <form action={cambiarEstadoSuscripcion} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="clubId" value={club.id} />
          <select
            name="status"
            defaultValue={club.subscriptionStatus}
            className={inputClass}
          >
            <option value="TRIALING">Prueba</option>
            <option value="ACTIVE">Activa</option>
            <option value="PAST_DUE">Vencida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-brand-400 to-accent-400 px-4 py-2 text-sm font-semibold text-[#06121f]"
          >
            Guardar
          </button>
        </form>
      </section>

      {/* Membresías */}
      <section className="rounded-2xl border border-white/8 bg-surface/50 p-5">
        <p className="text-sm font-semibold text-white">Membresías</p>

        <div className="mt-3 space-y-2">
          {club.memberships.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5"
            >
              <div>
                <p className="text-sm text-white">{m.user.email}</p>
                <p className="text-xs text-slate-400">
                  {ROLE_LABEL[m.role] ?? m.role}
                </p>
              </div>
              <form action={quitarMiembro}>
                <input type="hidden" name="clubId" value={club.id} />
                <input type="hidden" name="membershipId" value={m.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                >
                  Quitar
                </button>
              </form>
            </div>
          ))}
          {club.memberships.length === 0 && (
            <p className="text-sm text-slate-400">Sin miembros.</p>
          )}
        </div>

        <form action={asignarMiembro} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="clubId" value={club.id} />
          <input
            name="email"
            type="email"
            required
            placeholder="email@persona.com"
            className={`${inputClass} flex-1`}
          />
          <select name="role" defaultValue="STAFF" className={inputClass}>
            <option value="OWNER">Dueño</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Empleado</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Agregar
          </button>
        </form>
      </section>
    </div>
  );
}

const inputClass =
  "rounded-xl border border-white/15 bg-surface px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";
