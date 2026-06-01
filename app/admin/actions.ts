"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";

const ROLES = ["OWNER", "ADMIN", "STAFF"] as const;
type Role = (typeof ROLES)[number];

const STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];

export async function asignarMiembro(formData: FormData) {
  await requireSuperadmin();
  const clubId = String(formData.get("clubId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "STAFF");
  const role: Role = (ROLES as readonly string[]).includes(roleRaw)
    ? (roleRaw as Role)
    : "STAFF";
  if (!email.includes("@")) return;

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: email.split("@")[0] },
  });
  await prisma.membership.upsert({
    where: { userId_clubId: { userId: user.id, clubId } },
    update: { role },
    create: { userId: user.id, clubId, role },
  });
  revalidatePath(`/admin/clubes/${clubId}`);
}

export async function quitarMiembro(formData: FormData) {
  await requireSuperadmin();
  const clubId = String(formData.get("clubId"));
  const membershipId = String(formData.get("membershipId"));
  await prisma.membership.deleteMany({ where: { id: membershipId, clubId } });
  revalidatePath(`/admin/clubes/${clubId}`);
}

export async function cambiarEstadoSuscripcion(formData: FormData) {
  await requireSuperadmin();
  const clubId = String(formData.get("clubId"));
  const statusRaw = String(formData.get("status") ?? "");
  if (!(STATUSES as readonly string[]).includes(statusRaw)) return;
  const status = statusRaw as Status;

  await prisma.club.update({
    where: { id: clubId },
    data: { subscriptionStatus: status },
  });
  await prisma.subscription.updateMany({ where: { clubId }, data: { status } });
  revalidatePath(`/admin/clubes/${clubId}`);
  revalidatePath(`/admin`);
}

/** SUPERADMIN habilita/deshabilita los medios de pago disponibles para el club. */
export async function cambiarMediosPago(formData: FormData) {
  await requireSuperadmin();
  const clubId = String(formData.get("clubId"));
  const mpEnabled = formData.get("mpEnabled") === "on";
  const whatsappEnabled = formData.get("whatsappEnabled") === "on";

  await prisma.club.update({
    where: { id: clubId },
    data: { mpEnabled, whatsappEnabled },
  });
  revalidatePath(`/admin/clubes/${clubId}`);
}
