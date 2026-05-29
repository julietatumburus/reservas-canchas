import Link from "next/link";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-bg-soft">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              La forma simple de gestionar tu club de padel y tenis, y dejar que
              tus jugadores reserven y paguen online.
            </p>
          </div>

          <FooterCol
            title="Producto"
            items={[
              { label: "Deportes", href: "#deportes" },
              { label: "Cómo funciona", href: "#como-funciona" },
              { label: "Precios", href: "#precios" },
            ]}
          />
          <FooterCol
            title="Clubes"
            items={[
              { label: "Registrá tu club", href: "/registrar-club" },
              { label: "Ingresar", href: "/ingresar" },
              { label: "Para clubes", href: "#clubes" },
            ]}
          />
          <FooterCol
            title="Legal"
            items={[
              { label: "Términos", href: "#" },
              { label: "Privacidad", href: "#" },
              { label: "Contacto", href: "#" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Saque. Hecho en Argentina.</p>
          <p className="flex items-center gap-2">
            Pagos seguros con
            <span className="font-semibold text-slate-300">MercadoPago</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className="text-sm text-slate-400 transition-colors hover:text-brand-300"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
