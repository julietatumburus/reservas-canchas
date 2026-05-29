import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const superadminEmails = (process.env.SUPERADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Allowlist del login de prueba: emails autorizados a entrar con dev-login.
// En producción, si está vacía, NADIE entra por dev-login (salvo superadmins).
// En dev, vacía = cualquier email (comodidad local).
const devLoginEmails = (process.env.DEV_LOGIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// El login de prueba (Credentials) se habilita fuera de producción, o en prod
// SOLO si se pide explícitamente con ALLOW_DEV_LOGIN=true (inseguro: cualquiera
// entra como cualquier email; usar únicamente para testear, sacar antes de lanzar).
export const devLoginEnabled =
  process.env.ALLOW_DEV_LOGIN === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_LOGIN !== "false");

const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Acceso de prueba",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        if (!email.includes("@")) return null;
        // Capa de seguridad: limitar quién puede usar el login de prueba.
        const isProd = process.env.NODE_ENV === "production";
        const permitido =
          superadminEmails.includes(email) ||
          devLoginEmails.includes(email) ||
          (!isProd && devLoginEmails.length === 0);
        if (!permitido) return null;
        const role = superadminEmails.includes(email) ? "SUPERADMIN" : "USER";
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0], role },
        });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  );
}

// La cookie de sesión debe compartirse entre el dominio raíz y los subdominios
// de cada club (multitenancy). Por eso fijamos el dominio a ".<root>".
const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000").split(
  ":",
)[0];
const useSecureCookies = process.env.NODE_ENV === "production";
const cookieDomain = rootHost === "localhost" ? undefined : `.${rootHost}`;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/ingresar" },
  cookies: cookieDomain
    ? {
        sessionToken: {
          name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: useSecureCookies,
            domain: cookieDomain,
          },
        },
      }
    : undefined,
  providers,
  callbacks: {
    // Multitenancy: permitir redirigir al dominio raíz y a cualquier subdominio
    // de club (Auth.js por defecto fuerza el host base y se perdía el subdominio).
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (
          u.hostname === rootHost ||
          u.hostname.endsWith(`.${rootHost}`) ||
          u.hostname === "localhost"
        ) {
          return u.toString();
        }
      } catch {
        // url inválida -> caer al baseUrl
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      // Bootstrap de SUPERADMIN por email (configurado en SUPERADMIN_EMAILS).
      const email = token.email?.toLowerCase();
      if (email && superadminEmails.includes(email) && token.role !== "SUPERADMIN") {
        token.role = "SUPERADMIN";
        await prisma.user.updateMany({ where: { email }, data: { role: "SUPERADMIN" } });
      }
      if (!token.role) token.role = "USER";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
});

// ----------------------------------------------------------------------------
// Guards de sesión (runtime Node, en server components / actions)
// ----------------------------------------------------------------------------

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/ingresar");
  return session.user;
}

export async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user) redirect("/ingresar");
  if (session.user.role !== "SUPERADMIN") redirect("/");
  return session.user;
}
