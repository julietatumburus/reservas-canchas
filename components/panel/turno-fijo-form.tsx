"use client";

import { useRef, useState, useTransition } from "react";
import { DAYS } from "@/lib/slots";

type Court = { id: string; name: string };
type ReservaResult = { error?: string };

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DURACIONES = [60, 90, 120];

export function TurnoFijoForm({
  slug,
  courts,
  today,
  crearAction,
}: {
  slug: string;
  courts: Court[];
  today: string;
  crearAction: (fd: FormData) => Promise<ReservaResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const [pesos, setPesos] = useState(0);

  function onSubmit(fd: FormData) {
    setError(null);
    setOk(false);
    start(async () => {
      const res = await crearAction(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        formRef.current?.reset();
        setPesos(0);
        setOk(true);
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="space-y-4 rounded-2xl border border-white/8 bg-surface/50 p-5"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="priceCents" value={Math.round(pesos * 100)} />
      <p className="text-sm font-semibold text-white">Nuevo turno fijo</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Cancha
          <select name="courtId" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Elegí una cancha
            </option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Día
          <select name="dayOfWeek" className={inputClass} defaultValue="2">
            {DAY_ORDER.map((d) => (
              <option key={d} value={d}>
                {DAYS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Hora de inicio
          <input type="time" name="start" required defaultValue="20:00" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Duración
          <select name="duration" className={inputClass} defaultValue="90">
            {DURACIONES.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Cliente
          <input name="customerName" required placeholder="Nombre y apellido" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Teléfono (opcional)
          <input name="customerPhone" placeholder="11 5555 5555" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Precio ($)
          <input
            type="number"
            min={0}
            step={500}
            value={pesos}
            onChange={(e) => setPesos(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Desde
          <input type="date" name="validFrom" required defaultValue={today} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Hasta (opcional)
          <input type="date" name="validUntil" className={inputClass} />
        </label>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
      {ok && <p className="text-xs text-accent-300">Turno fijo creado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-2.5 text-sm font-semibold text-[#06121f] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Crear turno fijo"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-surface px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";
