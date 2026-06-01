"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/slots";
import type { AgendaSlot } from "@/lib/availability";

type Court = { id: string; name: string };
type ReservaResult = { error?: string };

export function AgendaGrid({
  slug,
  date,
  canEdit,
  courts,
  slotsByCourt,
  crearAction,
  cancelarAction,
  confirmarPagoAction,
}: {
  slug: string;
  date: string;
  canEdit: boolean;
  courts: Court[];
  slotsByCourt: Record<string, AgendaSlot[]>;
  crearAction: (fd: FormData) => Promise<ReservaResult>;
  cancelarAction: (fd: FormData) => Promise<void> | void;
  confirmarPagoAction: (fd: FormData) => Promise<void> | void;
}) {
  const [sel, setSel] = useState<{ court: Court; slot: AgendaSlot } | null>(null);

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => {
          const slots = slotsByCourt[court.id] ?? [];
          return (
            <div
              key={court.id}
              className="rounded-2xl border border-white/8 bg-surface/50 p-4"
            >
              <p className="mb-3 font-semibold text-white">{court.name}</p>
              {slots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
                  Sin horarios este día.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {slots.map((slot) => (
                    <SlotRow
                      key={slot.start}
                      slot={slot}
                      slug={slug}
                      canEdit={canEdit}
                      onBook={() => setSel({ court, slot })}
                      cancelarAction={cancelarAction}
                      confirmarPagoAction={confirmarPagoAction}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sel && (
        <NuevaReservaModal
          slug={slug}
          date={date}
          court={sel.court}
          slot={sel.slot}
          crearAction={crearAction}
          onClose={() => setSel(null)}
        />
      )}
    </>
  );
}

function SlotRow({
  slot,
  slug,
  canEdit,
  onBook,
  cancelarAction,
  confirmarPagoAction,
}: {
  slot: AgendaSlot;
  slug: string;
  canEdit: boolean;
  onBook: () => void;
  cancelarAction: (fd: FormData) => Promise<void> | void;
  confirmarPagoAction: (fd: FormData) => Promise<void> | void;
}) {
  if (slot.status === "closed") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
        <span>{slot.start}</span>
        <span>Cerrado</span>
      </div>
    );
  }

  if (slot.status === "booked") {
    const pending = slot.pending;
    const wrapperCls = pending
      ? "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs"
      : "rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs";
    const nameCls = pending ? "text-amber-200" : "text-brand-200";
    return (
      <div className={`flex items-center justify-between gap-2 ${wrapperCls}`}>
        <span className="min-w-0">
          <span className="text-slate-300">{slot.start}</span>{" "}
          <span className={`truncate font-medium ${nameCls}`}>
            {slot.label ?? "Ocupado"}
          </span>
          {pending && (
            <span className="ml-1 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
              pendiente
            </span>
          )}
        </span>
        {canEdit && slot.bookingId ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {pending && (
              <form action={confirmarPagoAction}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="bookingId" value={slot.bookingId} />
                <button
                  type="submit"
                  className="rounded-md border border-emerald-500/30 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/10"
                >
                  Confirmar pago
                </button>
              </form>
            )}
            <Link
              href={`/club/${slug}/panel/reservas/${slot.bookingId}/editar`}
              className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/5"
            >
              Editar
            </Link>
            <form action={cancelarAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="bookingId" value={slot.bookingId} />
              <button
                type="submit"
                className="rounded-md border border-red-500/20 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
              >
                Liberar
              </button>
            </form>
          </div>
        ) : (
          slot.recurring && (
            <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
              fijo
            </span>
          )
        )}
      </div>
    );
  }

  // free
  return (
    <button
      type="button"
      onClick={canEdit ? onBook : undefined}
      disabled={!canEdit}
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition-colors enabled:hover:border-brand-400/40 enabled:hover:bg-brand-500/10 disabled:cursor-default"
    >
      <span className="font-medium text-white">{slot.start}</span>
      <span className="mt-1 flex flex-wrap gap-1">
        {slot.durations.map((d) => (
          <span
            key={d.slotMinutes}
            className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-300"
          >
            {d.slotMinutes}′{d.priceCents > 0 ? ` · ${formatCents(d.priceCents)}` : ""}
          </span>
        ))}
      </span>
    </button>
  );
}

function NuevaReservaModal({
  slug,
  date,
  court,
  slot,
  crearAction,
  onClose,
}: {
  slug: string;
  date: string;
  court: Court;
  slot: AgendaSlot;
  crearAction: (fd: FormData) => Promise<ReservaResult>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [durIdx, setDurIdx] = useState(0);
  const dur = slot.durations[durIdx];
  const [pesos, setPesos] = useState(Math.round(dur.priceCents / 100));

  function elegirDuracion(idx: number) {
    setDurIdx(idx);
    setPesos(Math.round(slot.durations[idx].priceCents / 100));
  }

  function onSubmit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await crearAction(fd);
      if (res?.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-bg-soft p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-white">Nueva reserva</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {court.name} · {slot.start}–{dur.end}
        </p>

        <form action={onSubmit} className="mt-4 space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="courtId" value={court.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="startMinutes" value={slot.startMinutes} />
          <input type="hidden" name="endMinutes" value={dur.endMinutes} />
          <input type="hidden" name="priceCents" value={Math.round(pesos * 100)} />

          {slot.durations.length > 1 && (
            <div>
              <span className="mb-1.5 block text-xs text-slate-400">Duración</span>
              <div className="flex flex-wrap gap-2">
                {slot.durations.map((d, i) => (
                  <button
                    key={d.slotMinutes}
                    type="button"
                    onClick={() => elegirDuracion(i)}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm",
                      i === durIdx
                        ? "border-brand-400 bg-brand-500/15 text-white"
                        : "border-white/15 text-slate-200 hover:bg-white/5",
                    ].join(" ")}
                  >
                    {d.slotMinutes}′
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Cliente
            <input
              name="customerName"
              required
              autoFocus
              placeholder="Nombre y apellido"
              className={inputClass}
            />
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

          {error && <p className="text-xs text-red-300">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-brand-400 to-accent-400 px-4 py-2 text-sm font-semibold text-[#06121f] disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Reservar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-surface px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";
