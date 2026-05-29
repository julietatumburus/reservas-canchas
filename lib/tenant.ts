// Helpers de multitenancy por subdominio. SOLO funciones puras: este módulo lo
// importa el middleware (edge runtime), así que no debe importar Prisma ni
// next/headers.

// Subdominios reservados que NO representan un club (sirven el sitio raíz).
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "dashboard",
]);

function rootHostname(): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000";
  return root.split(":")[0].toLowerCase();
}

/**
 * Extrae el slug del club a partir del host. Devuelve null si el request va al
 * dominio raíz, a www, a un subdominio reservado, o a localhost / una IP.
 */
export function getSubdomain(host: string | null | undefined): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();
  const root = rootHostname();

  // localhost o IP directa => sitio raíz
  if (hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return null;
  }

  // dominio raíz exacto => sitio raíz
  if (hostname === root) return null;

  // <slug>.<root> => slug
  const suffix = `.${root}`;
  if (hostname.endsWith(suffix)) {
    const sub = hostname.slice(0, -suffix.length);
    // soporta solo el primer nivel (slug.root); ignora niveles extra
    const slug = sub.split(".").pop() ?? sub;
    if (!slug || RESERVED_SUBDOMAINS.has(slug)) return null;
    return slug;
  }

  return null;
}

/** Construye la URL pública de un club (para links desde la landing). */
export function clubUrl(slug: string): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000";
  const protocol = root.includes(":") ? "http" : "https";
  return `${protocol}://${slug}.${root}`;
}
