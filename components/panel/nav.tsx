"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/panel", label: "Resumen", exact: true },
  { href: "/panel/reservas", label: "Reservas", exact: false },
  { href: "/panel/canchas", label: "Canchas", exact: false },
  { href: "/panel/cierres", label: "Cierres", exact: false },
  { href: "/panel/ajustes", label: "Ajustes", exact: false },
];

export function PanelNav() {
  const path = usePathname();

  return (
    <nav className="flex gap-1 sm:flex-col">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
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
