"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { MenuIcon, CloseIcon } from "@/components/icons";

const links = [
  { href: "#deportes", label: "Deportes" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#clubes", label: "Para clubes" },
  { href: "#precios", label: "Precios" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/ingresar"
            className="text-sm font-medium text-slate-200 transition-colors hover:text-white"
          >
            Ingresar
          </Link>
          <Link
            href="/registrar-club"
            className="rounded-full bg-gradient-to-r from-brand-400 to-accent-400 px-4 py-2 text-sm font-semibold text-[#06121f] shadow-lg shadow-brand-500/20 transition-transform hover:scale-[1.03]"
          >
            Registrá tu club
          </Link>
        </div>

        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-slate-200 md:hidden"
        >
          {open ? <CloseIcon width={22} height={22} /> : <MenuIcon width={22} height={22} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/5 bg-bg/95 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href="/ingresar"
                className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-slate-100"
              >
                Ingresar
              </Link>
              <Link
                href="/registrar-club"
                className="rounded-lg bg-gradient-to-r from-brand-400 to-accent-400 px-4 py-2.5 text-center text-sm font-semibold text-[#06121f]"
              >
                Registrá tu club
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
