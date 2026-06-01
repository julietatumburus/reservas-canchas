"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** El jugador cancela un turno propio que todavía no empezó. */
export async function cancelarMiTurno(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id") ?? "");
  const booking = await prisma.booking.findFirst({
    where: { id, userId: session.user.id },
    select: { startTime: true },
  });
  if (!booking) return;
  if (booking.startTime <= new Date()) return; // ya pasó, no se cancela

  await prisma.booking.delete({ where: { id } });
  revalidatePath("/mis-turnos");
}
