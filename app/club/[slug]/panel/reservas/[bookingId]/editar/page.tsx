import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClubAccess } from "@/lib/club";
import { prisma } from "@/lib/prisma";
import { utcToLocalMinutes } from "@/lib/availability";
import { minutesToTime, formatCents } from "@/lib/slots";
import { editarReserva } from "../../../actions";

const fmtFecha = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(d);

export default async function EditarReservaPage({
  params,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
}) {
  const { slug, bookingId } = await params;
  const { club, role, isSuperadmin } = await requireClubAccess(slug);
  const canEdit = isSuperadmin || ["OWNER", "ADMIN", "STAFF"].includes(role);
  if (!canEdit) redirect(`/club/${slug}/panel/reservas`);

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clubId: club.id },
    include: { court: { select: { name: true } } },
  });
  if (!booking) notFound();

  const sm = utcToLocalMinutes(booking.startTime, club.timezone);
  const em = utcToLocalMinutes(booking.endTime, club.timezone);

  async function actualizar(formData: FormData) {
    "use server";
    await editarReserva(formData);
    redirect(`/club/${slug}/panel/reservas`);
  }

  return (
    <div>
      <Link
        href={`/club/${slug}/panel/reservas`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← Reservas
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
        Editar reserva
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {booking.court.name} ·{" "}
        <span className="capitalize">{fmtFecha(booking.startTime, club.timezone)}</span>{" "}
        · {minutesToTime(sm)}–{minutesToTime(em)}{" "}
        {booking.status === "PENDING" && (
          <span className="ml-1 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
            pendiente
          </span>
        )}
      </p>

      <form
        action={actualizar}
        className="mt-6 max-w-md space-y-4 rounded-2xl border border-white/8 bg-surface/50 p-5"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="bookingId" value={bookingId} />

        <label className="block text-xs text-slate-400">
          Nombre del cliente
          <input
            name="customerName"
            required
            defaultValue={booking.customerName ?? ""}
            className={inputClass + " mt-1"}
          />
        </label>

        <label className="block text-xs text-slate-400">
          Teléfono (opcional)
          <input
            name="customerPhone"
            defaultValue={booking.customerPhone ?? ""}
            placeholder="11 5555 5555"
            className={inputClass + " mt-1"}
          />
        </label>

        <label className="block text-xs text-slate-400">
          Precio ($)
          <input
            type="number"
            name="price"
            min={0}
            step={500}
            defaultValue={Math.round((booking.priceCents || 0) / 100)}
            className={inputClass + " mt-1"}
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Actual: {formatCents(booking.priceCents)}
          </span>
        </label>

        <label className="block text-xs text-slate-400">
          Notas internas
          <textarea
            name="notes"
            rows={3}
            defaultValue={booking.notes ?? ""}
            placeholder="Alergias, pelotas que pidió, observaciones…"
            className={inputClass + " mt-1 resize-none"}
          />
        </label>

        <div className="flex gap-2 pt-1">
          <Link
            href={`/club/${slug}/panel/reservas`}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-2.5 text-sm font-semibold text-[#06121f]"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-surface px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";
