import { requireClubAccess } from "@/lib/club";
import { actualizarAjustes } from "../actions";

export default async function AjustesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club, role, isSuperadmin } = await requireClubAccess(slug);
  const canEdit = isSuperadmin || role === "OWNER" || role === "ADMIN";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Ajustes</h1>
      <p className="mt-1 text-sm text-slate-400">
        Configuración de reservas del club.
      </p>

      <form
        action={actualizarAjustes}
        className="mt-6 max-w-md space-y-4 rounded-2xl border border-white/8 bg-surface/50 p-5"
      >
        <input type="hidden" name="slug" value={slug} />

        <label className="block">
          <span className="text-sm font-semibold text-white">
            Anticipación máxima de reserva
          </span>
          <p className="mt-1 text-xs text-slate-400">
            Hasta cuántos días en el futuro puede reservar un jugador.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              name="bookingWindowDays"
              min={1}
              max={365}
              defaultValue={club.bookingWindowDays}
              disabled={!canEdit}
              className="w-28 rounded-xl border border-white/15 bg-surface px-3 py-2.5 text-sm text-white focus:border-brand-400 focus:outline-none disabled:opacity-60"
            />
            <span className="text-sm text-slate-400">días</span>
          </div>
        </label>

        {canEdit && (
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-2.5 text-sm font-semibold text-[#06121f]"
          >
            Guardar
          </button>
        )}
      </form>
    </div>
  );
}
