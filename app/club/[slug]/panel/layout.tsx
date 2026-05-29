import { Logo } from "@/components/logo";
import { PanelNav } from "@/components/panel/nav";
import { requireClubAccess } from "@/lib/club";
import { signOut } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Admin",
  STAFF: "Empleado",
};

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club, role, isSuperadmin, user } = await requireClubAccess(slug);

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
            <span className="hidden text-sm text-slate-500 sm:block">/</span>
            <span className="hidden text-sm font-medium text-slate-200 sm:block">
              {club.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
              {isSuperadmin ? "Superadmin" : (ROLE_LABEL[role] ?? role)}
            </span>
            <span className="hidden text-xs text-slate-500 md:block">
              {user.email}
            </span>
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

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:flex-row">
        <aside className="sm:w-48 sm:shrink-0">
          <PanelNav slug={slug} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
