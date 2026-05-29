"use client";

import { useState, useTransition } from "react";
import { formatCents } from "@/lib/slots";
import type { AgendaSlot } from "@/lib/availability";

const SPORT_LABEL: Record<string, string> = {
  PADEL: "Padel",
  TENIS: "Tenis",
  FUTBOL: "Fútbol",
  OTRO: "Otro",
};

type Court = { id: string; name: string; sport: string };
type ReservaResult = { error?: string };

export function BookingGrid({
  slug,
  date,
  isLoggedIn,
  clubBaseUrl,
  courts,
  slotsByCourt,
  crearAction,
}: {
  slug: string;
  date: string;
  isLoggedIn: boolean;
  clubBaseUrl: string;
  courts: Court[];
  slotsByCourt: Record<string, AgendaSlot[]>;
  crearAction: (fd: FormData) => Promise<ReservaResult>;
}) {
  const loginHref = `/ingresar?callbackUrl=${encodeURIComponent(`${clubBaseUrl}/?date=${date}`)}`;
  const [sel, setSel] = useState<{ court: Court; slot: AgendaSlot } | null>(null);

  const sinTurnos = courts.every((c) => (slotsByCourt[c.id] ?? []).length === 0);
  if (sinTurnos) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-white/10 bg-surface/30 px-5 py-10 text-center text-sm text-slate-400">
        No hay turnos disponibles este día.
      </p>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => {
          const slots = slotsByCourt[court.id] ?? [];
          if (slots.length === 0) return null;
          return (
            <div
              key={court.id}
              className="rounded-2xl border border-white/8 bg-surface/50 p-4"
            >
              <p className="font-semibold text-white">{court.name}</p>
              <p className="mb-3 text-xs text-slate-400">
                {SPORT_LABEL[court.sport] ?? court.sport}
              </p>
              <div className="space-y-1.5">
                {slots.map((slot) => {
                  if (slot.status !== "free") {
                    return (
                      <div
                        key={slot.start}
                        className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-slate-500"
                      >
                        <span>{slot.start}</span>
                        <span>{slot.status === "closed" ? "Cerrado" : "Ocupado"}</span>
                      </div>
                    );
                  }
                  const inner = (
                    <>
                      <span className="font-medium text-white">{slot.start}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {slot.durations.map((d) => (
                          <span
                            key={d.slotMinutes}
                            className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-300"
                          >
                            {d.slotMinutes}′
                            {d.priceCents > 0 ? ` · ${formatCents(d.priceCents)}` : ""}
                          </span>
                        ))}
                      </span>
                    </>
                  );
                  const cls =
                    "block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10";
                  return isLoggedIn ? (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => setSel({ court, slot })}
                      className={cls}
                    >
                      {inner}
                    </button>
                  ) : (
                    <a key={slot.start} href={loginHref} className={cls}>
                      {inner}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {sel && (
        <ConfirmarModal
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

function ConfirmarModal({
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
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [durIdx, setDurIdx] = useState(0);
  const dur = slot.durations[durIdx];

  function onSubmit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await crearAction(fd);
      if (res?.error) setError(res.error);
      else setDone(true);
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
        {done ? (
          <div className="text-center">
            <p className="text-base font-semibold text-white">¡Turno reservado!</p>
            <p className="mt-1 text-sm text-slate-400">
              {court.name} · {slot.start}–{dur.end}
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-4 py-2.5 text-sm font-semibold text-[#06121f]"
            >
              Listo
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-white">Confirmar reserva</p>
            <p className="mt-2 text-sm text-slate-300">
              {court.name}
              <br />
              {slot.start}–{dur.end}
              {dur.priceCents > 0 ? (
                <>
                  {" · "}
                  <span className="text-brand-200">{formatCents(dur.priceCents)}</span>
                </>
              ) : null}
            </p>

            {slot.durations.length > 1 && (
              <div className="mt-4">
                <span className="mb-1.5 block text-xs text-slate-400">Duración</span>
                <div className="flex flex-wrap gap-2">
                  {slot.durations.map((d, i) => (
                    <button
                      key={d.slotMinutes}
                      type="button"
                      onClick={() => setDurIdx(i)}
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

            {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

            <form action={onSubmit} className="mt-4 flex justify-end gap-2">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="courtId" value={court.id} />
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="startMinutes" value={slot.startMinutes} />
              <input type="hidden" name="endMinutes" value={dur.endMinutes} />
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
                {pending ? "Reservando…" : "Confirmar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
