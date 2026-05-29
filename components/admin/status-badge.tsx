export const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Vencida",
  CANCELLED: "Cancelada",
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-brand-500/15 text-brand-200"
      : status === "PAST_DUE"
        ? "bg-red-500/15 text-red-300"
        : status === "CANCELLED"
          ? "bg-white/5 text-slate-400"
          : "bg-accent-400/15 text-accent-300";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
