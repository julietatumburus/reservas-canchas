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
              className={inputClass + " w-28"}
            />
            <span className="text-sm text-slate-400">días</span>
          </div>
        </label>

        <div className="border-t border-white/8 pt-4">
          <span className="text-sm font-semibold text-white">
            Seña (cobro por MercadoPago)
          </span>
          <p className="mt-1 text-xs text-slate-400">
            El jugador paga la seña al reservar. El turno queda confirmado cuando
            MercadoPago aprueba el pago.
          </p>

          <label className="mt-3 block text-xs text-slate-400">
            Modo
            <select
              name="depositMode"
              defaultValue={club.depositMode}
              disabled={!canEdit}
              className={inputClass + " mt-1"}
            >
              <option value="NONE">Sin seña (turno confirmado al instante)</option>
              <option value="PERCENT">Porcentaje del precio</option>
              <option value="FIXED">Monto fijo</option>
            </select>
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-400">
              Porcentaje (%)
              <input
                type="number"
                name="depositPercent"
                min={0}
                max={100}
                step={5}
                defaultValue={club.depositPercent}
                disabled={!canEdit}
                className={inputClass + " mt-1"}
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Solo se usa si el modo es &quot;Porcentaje&quot;.
              </span>
            </label>

            <label className="block text-xs text-slate-400">
              Monto fijo ($)
              <input
                type="number"
                name="depositAmount"
                min={0}
                step={500}
                defaultValue={Math.round((club.depositAmountCents || 0) / 100)}
                disabled={!canEdit}
                className={inputClass + " mt-1"}
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Solo se usa si el modo es &quot;Monto fijo&quot;.
              </span>
            </label>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Necesitás configurar la variable <code>MP_ACCESS_TOKEN</code> en el
            server con el token de MercadoPago. Sin token, los turnos con seña no
            se pueden cobrar.
          </p>
        </div>

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

const inputClass =
  "rounded-xl border border-white/15 bg-surface px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none disabled:opacity-60";
