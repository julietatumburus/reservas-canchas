import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clubUrl } from "@/lib/tenant";
import { StatusBadge } from "@/components/admin/status-badge";

export default async function AdminClubsPage() {
  await requireSuperadmin();

  const clubs = await prisma.club.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { courts: true, bookings: true } },
      memberships: {
        where: { role: "OWNER" },
        include: { user: true },
        take: 1,
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Clubes</h1>
      <p className="mt-1 text-sm text-slate-400">
        {clubs.length} club(es) en la plataforma.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Club</th>
              <th className="px-4 py-3 font-medium">Dueño</th>
              <th className="px-4 py-3 font-medium">Canchas</th>
              <th className="px-4 py-3 font-medium">Suscripción</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clubs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Todavía no hay clubes registrados.
                </td>
              </tr>
            )}
            {clubs.map((c) => (
              <tr key={c.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{c.name}</p>
                  <a
                    href={clubUrl(c.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-300 hover:underline"
                  >
                    {c.slug}
                  </a>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {c.memberships[0]?.user.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-300">{c._count.courts}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.subscriptionStatus} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/clubes/${c.id}`}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                  >
                    Gestionar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
