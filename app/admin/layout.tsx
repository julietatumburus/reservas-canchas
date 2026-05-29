import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireSuperadmin, signOut } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperadmin();

  async function cerrarSesion() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/8 bg-bg-soft/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-200">
              Superadmin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:block">
              {user.email}
            </span>
            <Link
              href="/admin"
              className="text-sm font-medium text-slate-200 hover:text-white"
            >
              Clubes
            </Link>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
