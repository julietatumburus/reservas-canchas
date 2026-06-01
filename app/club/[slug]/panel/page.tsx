import Link from "next/link";
import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import {
  todayInTz,
  dayRangeUtc,
  shiftDate,
  utcToLocalMinutes,
} from "@/lib/availability";
import { minutesToTime, formatCents } from "@/lib/slots";
import {
  ArrowRightIcon,
  CalendarIcon,
  BoltIcon,
  ClockIcon,
  CardIcon,
  UsersIcon,
} from "@/components/icons";

export default async function PanelHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club } = await requireClubAccess(slug);

  const today = todayInTz(club.timezone);
  const monthStart = today.slice(0, 8) + "01"; // "YYYY-MM-01"
  const sevenDaysFromNow = shiftDate(today, 7);

  const { start: hoyStart, end: hoyEnd } = dayRangeUtc(today, club.timezone);
  const { start: mesStart } = dayRangeUtc(monthStart, club.timezone);
  const { end: en7DiasEnd } = dayRangeUtc(sevenDaysFromNow, club.timezone);

  // Reservas activas (no canceladas, no PENDING expiradas).
  const activasWhere = {
    clubId: club.id,
    status: { not: "CANCELLED" as const },
  };

  const [
    totalCanchas,
    activas,
    reservasHoy,
    reservasSemana,
    ingresosMesAgg,
    bookingsMes,
  ] = await Promise.all([
    prisma.court.count({ where: { clubId: club.id } }),
    prisma.court.count({ where: { clubId: club.id, active: true } }),
    prisma.booking.count({
      where: {
        ...activasWhere,
        startTime: { gte: hoyStart, lt: hoyEnd },
      },
    }),
    prisma.booking.count({
      where: {
        ...activasWhere,
        startTime: { gte: hoyStart, lt: en7DiasEnd },
      },
    }),
    prisma.booking.aggregate({
      where: {
        clubId: club.id,
        status: "CONFIRMED",
        startTime: { gte: mesStart, lt: en7DiasEnd },
      },
      _sum: { priceCents: true },
    }),
    prisma.booking.findMany({
      where: {
        clubId: club.id,
        status: { not: "CANCELLED" },
        startTime: { gte: mesStart },
      },
      select: {
        startTime: true,
        customerName: true,
        customerPhone: true,
        priceCents: true,
      },
      orderBy: { startTime: "desc" },
      take: 500, // suficiente para métricas de un mes
    }),
  ]);

  const ingresosMes = ingresosMesAgg._sum.priceCents ?? 0;

  // Top 5 horarios más reservados del mes (por inicio en hora local del club).
  const horarioCount = new Map<number, number>();
  for (const b of bookingsMes) {
    const mins = utcToLocalMinutes(b.startTime, club.timezone);
    horarioCount.set(mins, (horarioCount.get(mins) ?? 0) + 1);
  }
  const topHorarios = [...horarioCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top 5 clientes recurrentes del mes (por nombre + teléfono).
  const clienteCount = new Map<string, { nombre: string; reservas: number }>();
  for (const b of bookingsMes) {
    const nombre = (b.customerName ?? "").trim();
    if (!nombre) continue;
    const key = `${nombre.toLowerCase()}|${(b.customerPhone ?? "").trim()}`;
    const prev = clienteCount.get(key);
    if (prev) prev.reservas += 1;
    else clienteCount.set(key, { nombre, reservas: 1 });
  }
  const topClientes = [...clienteCount.values()]
    .sort((a, b) => b.reservas - a.reservas)
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Hola, {club.name}
      </h1>
      <p className="mt-1 text-sm text-slate-400">Resumen del club.</p>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<CalendarIcon width={18} height={18} />} value={reservasHoy} label="Reservas hoy" />
        <Kpi icon={<ClockIcon width={18} height={18} />} value={reservasSemana} label="Próximas 7 días" />
        <Kpi icon={<CardIcon width={18} height={18} />} value={formatCents(ingresosMes)} label="Ingresos del mes" />
        <Kpi icon={<BoltIcon width={18} height={18} />} value={`${activas}/${totalCanchas}`} label="Canchas activas" />
      </div>

      {/* Accesos */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AccesoCard href={`/club/${slug}/panel/reservas`} icon={<CalendarIcon width={20} height={20} />} title="Reservas" sub="Agenda y turnos fijos" tone="accent" />
        <AccesoCard href={`/club/${slug}/panel/canchas`} icon={<BoltIcon width={20} height={20} />} title="Canchas" sub="Dar de alta y editar" tone="brand" />
        <AccesoCard href={`/club/${slug}/panel/clientes`} icon={<UsersIcon width={20} height={20} />} title="Clientes" sub="Historial y recurrencia" tone="brand" />
      </div>

      {/* Tops */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Horarios más reservados (mes)">
          {topHorarios.length === 0 ? (
            <Empty>No hay datos del mes todavía.</Empty>
          ) : (
            <ul className="space-y-2">
              {topHorarios.map(([mins, n]) => (
                <li
                  key={mins}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-white">{minutesToTime(mins)}</span>
                  <span className="text-slate-400">{n} reservas</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Clientes recurrentes (mes)">
          {topClientes.length === 0 ? (
            <Empty>Sin clientes registrados aún.</Empty>
          ) : (
            <ul className="space-y-2">
              {topClientes.map((c) => (
                <li
                  key={c.nombre}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-white">{c.nombre}</span>
                  <span className="text-slate-400">{c.reservas} reservas</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-5">
      <div className="flex items-center gap-2 text-brand-300">{icon}</div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function AccesoCard({
  href,
  icon,
  title,
  sub,
  tone = "brand",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone?: "brand" | "accent";
}) {
  const colorBg = tone === "accent" ? "bg-accent-500/15 text-accent-300" : "bg-brand-500/15 text-brand-300";
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-white/8 bg-surface/50 p-5 transition-colors hover:border-brand-400/40"
    >
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${colorBg}`}>
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>
      </div>
      <ArrowRightIcon
        width={18}
        height={18}
        className="text-slate-500 transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-surface/50 p-5">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
      {children}
    </p>
  );
}
