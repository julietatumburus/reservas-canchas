import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { signIn, auth, devLoginEnabled } from "@/lib/auth";

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const dest = callbackUrl || "/post-login";

  const session = await auth();
  if (session?.user) redirect("/post-login");

  const googleEnabled = !!(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const devEnabled = devLoginEnabled;

  async function googleSignIn() {
    "use server";
    await signIn("google", { redirectTo: dest });
  }

  async function devSignIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    await signIn("dev", { email, redirectTo: dest });
  }

  return (
    <div className="bg-grid flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-5">
        <Logo />
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 pb-16">
        <h1 className="text-2xl font-bold tracking-tight text-white">Ingresar</h1>
        <p className="mt-2 text-sm text-slate-400">
          Accedé para reservar o para gestionar tu club.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            No pudimos iniciar sesión. Probá de nuevo.
          </p>
        )}

        <div className="mt-7 space-y-4">
          {googleEnabled && (
            <form action={googleSignIn}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <GoogleGlyph />
                Continuar con Google
              </button>
            </form>
          )}

          {googleEnabled && devEnabled && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-white/10" />o<span className="h-px flex-1 bg-white/10" />
            </div>
          )}

          {devEnabled && (
            <form action={devSignIn} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Acceso de prueba (solo desarrollo)
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-white/15 bg-surface px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-brand-400 to-accent-400 px-4 py-3 text-sm font-semibold text-[#06121f] transition-transform hover:scale-[1.01]"
              >
                Entrar
              </button>
            </form>
          )}

          {!googleEnabled && !devEnabled && (
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-400">
              No hay métodos de acceso configurados. Configurá Google OAuth en el
              entorno.
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          ¿Tenés un club?{" "}
          <Link href="/registrar-club" className="text-brand-300 hover:underline">
            Registralo
          </Link>
        </p>
      </main>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
