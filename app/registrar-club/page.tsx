import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ArrowRightIcon } from "@/components/icons";
import { auth, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant";
import { ROOT_DOMAIN } from "@/lib/env";

const ALLOWED_SPORTS = ["PADEL", "TENIS", "FUTBOL", "OTRO"] as const;
type Sport = (typeof ALLOWED_SPORTS)[number];

const ERRORS: Record<string, string> = {
  nombre: "Ingresá un nombre válido para el club.",
  slug: "El subdominio solo puede tener letras, números y guiones (3 a 32).",
  "slug-taken": "Ese subdominio ya está en uso. Probá otro.",
};

export default async function RegistrarClubPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Registrá tu <span className="text-gradient">club</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Primero ingresá con tu cuenta para crear el club.
        </p>
        <Link
          href="/ingresar?callbackUrl=/registrar-club"
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-3 text-sm font-semibold text-[#06121f]"
        >
          Ingresar para continuar
          <ArrowRightIcon width={18} height={18} />
        </Link>
      </Shell>
    );
  }

  async function crearClub(formData: FormData) {
    "use server";
    const user = await requireUser();

    const nombre = String(formData.get("nombre") ?? "").trim();
    const slug = String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const ciudad = String(formData.get("ciudad") ?? "").trim();
    const sports = formData
      .getAll("sports")
      .map(String)
      .filter((s): s is Sport => (ALLOWED_SPORTS as readonly string[]).includes(s));

    if (nombre.length < 2) redirect("/registrar-club?error=nombre");
    if (
      !/^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/.test(slug) ||
      RESERVED_SUBDOMAINS.has(slug)
    ) {
      redirect("/registrar-club?error=slug");
    }

    const existing = await prisma.club.findUnique({ where: { slug } });
    if (existing) redirect("/registrar-club?error=slug-taken");

    await prisma.club.create({
      data: {
        name: nombre,
        slug,
        city: ciudad || null,
        sports: sports.length ? sports : ["PADEL"],
        subscriptionStatus: "TRIALING",
        memberships: { create: { userId: user.id, role: "OWNER" } },
        subscription: { create: { plan: "FREE", status: "TRIALING" } },
      },
    });

    // mismo origen: /post-login resuelve el salto al subdominio client-side
    redirect("/post-login");
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Registrá tu <span className="text-gradient">club</span>
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Creá tu espacio. Vas a poder cargar canchas y horarios enseguida.
      </p>

      {error && ERRORS[error] && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {ERRORS[error]}
        </p>
      )}

      <form action={crearClub} className="mt-7 space-y-5">
        <Field label="Nombre del club">
          <input
            name="nombre"
            required
            placeholder="Club La Quinta"
            className={inputClass}
          />
        </Field>

        <Field label="Subdominio" hint={`Tu sitio será: <subdominio>.${ROOT_DOMAIN}`}>
          <input
            name="slug"
            required
            placeholder="laquinta"
            pattern="[a-zA-Z0-9-]+"
            className={inputClass}
          />
        </Field>

        <Field label="Ciudad (opcional)">
          <input name="ciudad" placeholder="Buenos Aires" className={inputClass} />
        </Field>

        <Field label="Deportes">
          <div className="flex flex-wrap gap-2">
            {(["PADEL", "TENIS", "FUTBOL", "OTRO"] as const).map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-surface px-3 py-2 text-sm text-slate-200 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-500/15"
              >
                <input
                  type="checkbox"
                  name="sports"
                  value={s}
                  defaultChecked={s === "PADEL"}
                  className="accent-brand-400"
                />
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
        </Field>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-5 py-3 text-sm font-semibold text-[#06121f] transition-transform hover:scale-[1.01]"
        >
          Crear club
          <ArrowRightIcon width={18} height={18} />
        </button>
      </form>
    </Shell>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-surface px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-grid flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-5">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        {children}
      </main>
    </div>
  );
}
