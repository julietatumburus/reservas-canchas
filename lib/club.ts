import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type ClubRole = "OWNER" | "ADMIN" | "STAFF";

/** Slug del club actual, leído del header que setea proxy.ts (por subdominio). */
export async function getCurrentClubSlug(): Promise<string | null> {
  const h = await headers();
  return h.get("x-club-slug");
}

export async function getClubBySlug(slug: string) {
  return prisma.club.findUnique({ where: { slug } });
}

/** Club del subdominio actual (o null si estamos en el dominio raíz). */
export async function getCurrentClub() {
  const slug = await getCurrentClubSlug();
  if (!slug) return null;
  return getClubBySlug(slug);
}

export async function getMembership(userId: string, clubId: string) {
  return prisma.membership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
}

/**
 * Exige sesión + acceso al club (por slug) con alguno de los roles dados.
 * SUPERADMIN siempre pasa. Devuelve el club, el usuario y su rol efectivo.
 * - Sin sesión -> redirige a /ingresar.
 * - Club inexistente -> 404.
 * - Sin permisos -> 404 (no filtra existencia de paneles ajenos).
 */
export async function requireClubAccess(
  slug: string,
  roles: ClubRole[] = ["OWNER", "ADMIN", "STAFF"],
) {
  const session = await auth();
  if (!session?.user) redirect("/ingresar");

  const club = await getClubBySlug(slug);
  if (!club) notFound();

  if (session.user.role === "SUPERADMIN") {
    return { club, user: session.user, role: "OWNER" as ClubRole, isSuperadmin: true };
  }

  const membership = await getMembership(session.user.id, club.id);
  if (!membership || !roles.includes(membership.role as ClubRole)) {
    notFound();
  }

  return {
    club,
    user: session.user,
    role: membership.role as ClubRole,
    isSuperadmin: false,
  };
}
