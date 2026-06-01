import Link from "next/link";
import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/slots";

const fmtFecha = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: tz,
  }).format(d);

type ClienteAgg = {
  nombre: string;
  telefono: string;
  reservas: number;
  totalGastadoCents: number;
  ultimaReserva: Date;
};

export default async function ClientesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club } = await requireClubAccess(slug);

  const bookings = await prisma.booking.findMany({
    where: { clubId: club.id, status: { not: "CANCELLED" } },
    select: {
      startTime: true,
      customerName: true,
      customerPhone: true,
      priceCents: true,
      status: true,
    },
    orderBy: { startTime: "desc" },
  });

  // Agrupar por nombre + teléfono normalizado.
  const map = new Map<string, ClienteAgg>();
  for (const b of bookings) {
    const nombre = (b.customerName ?? "").trim();
    if (!nombre) continue;
    const telefono = (b.customerPhone ?? "").trim();
    const key = `${nombre.toLowerCase()}|${telefono}`;
    const cuentaPlata = b.status === "CONFIRMED" ? b.priceCents : 0;
    const prev = map.get(key);
    if (prev) {
      prev.reservas += 1;
      prev.totalGastadoCents += cuentaPlata;
      if (b.startTime > prev.ultimaReserva) prev.ultimaReserva = b.startTime;
    } else {
      map.set(key, {
        nombre,
        telefono,
        reservas: 1,
        totalGastadoCents: cuentaPlata,
        ultimaReserva: b.startTime,
      });
    }
  }
  const clientes = [...map.values()].sort(
    (a, b) => b.ultimaReserva.getTime() - a.ultimaReserva.getTime(),
  );

  const totalReservas = bookings.length;
  const totalClientes = clientes.length;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Clientes</h1>
      <p className="mt-1 text-sm text-slate-400">
        Historial de clientes derivado de las reservas del club.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-5">
          <p className="text-3xl font-bold text-white">{totalClientes}</p>
          <p className="mt-1 text-sm text-slate-400">Clientes distintos</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-5">
          <p className="text-3xl font-bold text-white">{totalReservas}</p>
          <p className="mt-1 text-sm text-slate-400">Reservas totales</p>
        </div>
      </div>

      <div className="mt-6">
        {clientes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
            Todavía no hay clientes con reservas.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-surface/50">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8 bg-white/[0.02] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Cliente</th>
                  <th className="px-5 py-3 text-left font-medium">Teléfono</th>
                  <th className="px-5 py-3 text-right font-medium">Reservas</th>
                  <th className="px-5 py-3 text-right font-medium">Última</th>
                  <th className="px-5 py-3 text-right font-medium">Total gastado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr
                    key={`${c.nombre}|${c.telefono}`}
                    className="border-t border-white/5 text-slate-200 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3 font-medium text-white">{c.nombre}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {c.telefono || <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">{c.reservas}</td>
                    <td className="px-5 py-3 text-right text-slate-300">
                      {fmtFecha(c.ultimaReserva, club.timezone)}
                    </td>
                    <td className="px-5 py-3 text-right text-brand-200">
                      {formatCents(c.totalGastadoCents)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.telefono && (
                        <a
                          href={`https://wa.me/${c.telefono.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/5"
                        >
                          WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        ¿Falta un cliente? Aparecen cuando cargás una reserva manual (o el jugador
        reserva online). <Link href={`/club/${slug}/panel/reservas`} className="text-brand-300 hover:underline">Ir a la agenda</Link>.
      </p>
    </div>
  );
}
