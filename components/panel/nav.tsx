"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { seg: "", label: "Resumen", exact: true },
  { seg: "/reservas", label: "Reservas", exact: false },
  { seg: "/clientes", label: "Clientes", exact: false },
  { seg: "/canchas", label: "Canchas", exact: false },
  { seg: "/cierres", label: "Cierres", exact: false },
  { seg: "/ajustes", label: "Ajustes", exact: false },
];

export function PanelNav({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/club/${slug}/panel`;

  return (
    <nav className="flex gap-1 sm:flex-col">
      {items.map((it) => {
        const href = `${base}${it.seg}`;
        const active = it.exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-500/15 text-brand-200"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
