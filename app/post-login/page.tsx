import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clubUrl } from "@/lib/tenant";
import { RedirectTo } from "@/components/redirect-to";

// Decide a dónde mandar al usuario después de loguearse, según su rol.
// Es una página (no route handler) para ser un destino válido de redirect()
// desde server actions. El salto al subdominio del club se hace client-side.
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/ingresar");

  if (session.user.role === "SUPERADMIN") redirect("/admin");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { club: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) redirect("/registrar-club");

  return (
    <RedirectTo
      url={`${clubUrl(membership.club.slug)}/panel`}
      label={`Entrando a ${membership.club.name}…`}
    />
  );
}
