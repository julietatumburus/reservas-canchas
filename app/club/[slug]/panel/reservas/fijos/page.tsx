import Link from "next/link";
import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import { DAYS, minutesToTime, formatCents } from "@/lib/slots";
import { todayInTz } from "@/lib/availability";
import { TurnoFijoForm } from "@/components/panel/turno-fijo-form";
import { crearTurnoFijo, borrarTurnoFijo } from "../../actions";

const fmtFecha = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);

export default async function TurnosFijosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club, role, isSuperadmin } = await requireClubAccess(slug);
  const canEdit = isSuperadmin || ["OWNER", "ADMIN", "STAFF"].includes(role);

  const [courts, fijos] = await Promise.all([
    prisma.court.findMany({
      where: { clubId: club.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.recurringBooking.findMany({
      where: { clubId: club.id, active: true },
      include: { court: { select: { name: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
    }),
  ]);

  const today = todayInTz(club.timezone);

  return (
    <div>
      <Link href="/panel/reservas" className="text-sm text-slate-400 hover:text-white">
        ← Reservas
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Turnos fijos</h1>
      <p className="mt-1 text-sm text-slate-400">
        Reservas recurrentes semanales para un cliente. La agenda los marca
        ocupados todas las semanas dentro de la vigencia.
      </p>

      {canEdit && courts.length > 0 && (
        <div className="mt-6">
          <TurnoFijoForm
            slug={slug}
            courts={courts}
            today={today}
            crearAction={crearTurnoFijo}
          />
        </div>
      )}

      {courts.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
          Cargá canchas activas antes de crear turnos fijos.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {fijos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-8 text-center text-sm text-slate-400">
            Todavía no hay turnos fijos.
          </p>
        ) : (
          fijos.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-surface/50 p-5"
            >
              <div>
                <p className="font-semibold text-white">
                  {f.customerName}
                  <span className="ml-2 font-normal text-slate-400">
                    {DAYS[f.dayOfWeek]} {minutesToTime(f.startMinutes)}–
                    {minutesToTime(f.endMinutes)}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {f.court.name}
                  {f.priceCents > 0 ? ` · ${formatCents(f.priceCents)}` : ""}
                  {f.customerPhone ? ` · ${f.customerPhone}` : ""}
                  {" · desde "}
                  {fmtFecha(f.validFrom)}
                  {f.validUntil ? ` hasta ${fmtFecha(f.validUntil)}` : ""}
                </p>
              </div>
              {canEdit && (
                <form action={borrarTurnoFijo}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Borrar
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
