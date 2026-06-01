import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/slots";
import { ArrowRightIcon, CalendarIcon, ClockIcon } from "@/components/icons";
import { cancelarMiTurno } from "./actions";

function fmtFecha(d: Date, tz: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: tz,
  }).format(d);
}

function fmtHora(d: Date, tz: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(d);
}

export default async function MisTurnosPage() {
  const session = await auth();
  if (!session?.user) redirect("/ingresar?callbackUrl=/mis-turnos");

  const now = new Date();
  const all = await prisma.booking.findMany({
    where: { userId: session.user.id, status: { not: "CANCELLED" } },
    include: {
      club: { select: { name: true, slug: true, timezone: true } },
      court: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
  });
  // Excluir reservas PENDING cuyo comprobante venció (slot liberado).
  const active = all.filter(
    (b) => !(b.status === "PENDING" && b.proofDeadline && b.proofDeadline <= now),
  );
  const upcoming = active.filter((b) => b.startTime > now).reverse();
  const past = active.filter((b) => b.startTime <= now);

  async function cerrarSesion() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="bg-grid flex min-h-screen flex-col">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5">
          <Logo href="/" />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:block">
              {session.user.email}
            </span>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Mis turnos</h1>
        <p className="mt-1 text-sm text-slate-400">
          Acá ves tus reservas y podés cancelarlas antes del horario.
        </p>

        <Section title="Próximos">
          {upcoming.length === 0 ? (
            <EmptyState message="No tenés turnos próximos." />
          ) : (
            upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} canCancel />
            ))
          )}
        </Section>

        <Section title="Anteriores">
          {past.length === 0 ? (
            <EmptyState message="Sin turnos pasados todavía." />
          ) : (
            past.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
      {message}
    </p>
  );
}

type BookingRow = {
  id: string;
  startTime: Date;
  endTime: Date;
  priceCents: number;
  status: string;
  club: { name: string; slug: string; timezone: string };
  court: { name: string };
};

function BookingCard({
  booking,
  canCancel = false,
}: {
  booking: BookingRow;
  canCancel?: boolean;
}) {
  const tz = booking.club.timezone;
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-white">
            {booking.club.name}
            {booking.status === "PENDING" && (
              <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                Pendiente
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-slate-400">{booking.court.name}</p>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5 capitalize">
              <CalendarIcon width={14} height={14} className="text-slate-500" />
              {fmtFecha(booking.startTime, tz)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon width={14} height={14} className="text-slate-500" />
              {fmtHora(booking.startTime, tz)}–{fmtHora(booking.endTime, tz)}
            </span>
            {booking.priceCents > 0 && (
              <span className="text-brand-200">
                {formatCents(booking.priceCents)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/club/${booking.club.slug}`}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
          >
            Ir al club
            <ArrowRightIcon width={12} height={12} className="ml-1 inline" />
          </Link>
          {canCancel && (
            <form action={cancelarMiTurno}>
              <input type="hidden" name="id" value={booking.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-500/25 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
