import { NextResponse, type NextRequest } from "next/server";
import { getSubdomain } from "@/lib/tenant";

// Rutas que son globales (mismo en raíz y en subdominios): auth, panel superadmin
// y la API. NO se reescriben al espacio /club/<slug>.
const GLOBAL_PREFIXES = [
  "/ingresar",
  "/registrar-club",
  "/post-login",
  "/admin",
  "/api",
];

function isGlobalPath(pathname: string): boolean {
  return GLOBAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

// Multitenancy por subdominio (Next 16: "proxy", antes "middleware"):
//  - Dominio raíz (tuapp.com / lvh.me:3000)  -> sitio de marketing + panel.
//  - <club>.tuapp.com                         -> app de reservas de ese club,
//    reescrita internamente a /club/<slug>/... (excepto rutas globales).
export function proxy(req: NextRequest) {
  const slug = getSubdomain(req.headers.get("host"));

  if (!slug) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Las rutas de auth/admin se sirven igual en el subdominio (sin reescribir),
  // así /ingresar, /registrar-club, /post-login funcionan en cualquier host.
  if (isGlobalPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set("x-club-slug", slug);
    return res;
  }

  const url = req.nextUrl.clone();
  if (!url.pathname.startsWith(`/club/${slug}`)) {
    const rest = pathname === "/" ? "" : pathname;
    url.pathname = `/club/${slug}${rest}`;
  }

  const res = NextResponse.rewrite(url);
  res.headers.set("x-club-slug", slug);
  return res;
}

export const config = {
  // Todo, excepto _next, la API, y archivos con extensión (assets estáticos).
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
