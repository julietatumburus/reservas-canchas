import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMpPayment, mapMpStatus } from "@/lib/payments";

// Webhook público de MercadoPago. Recibe notificaciones de cambios de pago,
// consulta el detalle del pago contra la API de MP y actualiza Payment + Booking
// en nuestra DB. Sin auth (MP no autentica): firma HMAC opcional vía MP_WEBHOOK_SECRET
// queda como TODO para producción seria.

async function handle(mpPaymentId: string | null) {
  if (!mpPaymentId) return;
  const pay = await fetchMpPayment(mpPaymentId);
  if (!pay || !pay.externalReference) return;

  const status = mapMpStatus(pay.status);
  const ourPaymentId = pay.externalReference;

  await prisma.payment.updateMany({
    where: { id: ourPaymentId },
    data: { status, mpPaymentId },
  });

  if (status === "APPROVED") {
    await prisma.booking.updateMany({
      where: { paymentId: ourPaymentId, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });
  } else if (status === "REJECTED" || status === "CANCELLED") {
    // Libera el slot eliminando el booking PENDING asociado.
    await prisma.booking.deleteMany({
      where: { paymentId: ourPaymentId, status: "PENDING" },
    });
  }
}

export async function POST(request: Request) {
  let mpPaymentId: string | null = null;
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object") {
      const b = body as { type?: string; data?: { id?: string | number }; id?: string | number };
      if (b.type === "payment" && b.data?.id !== undefined) mpPaymentId = String(b.data.id);
      else if (b.id !== undefined) mpPaymentId = String(b.id);
    }
  } catch {
    // body inválido -> ignorar
  }
  await handle(mpPaymentId);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  // IPN legacy de MP: ?topic=payment&id=123
  const url = new URL(request.url);
  const topic = url.searchParams.get("topic") ?? url.searchParams.get("type");
  const id = url.searchParams.get("id") ?? url.searchParams.get("data.id");
  if (topic === "payment") await handle(id);
  return NextResponse.json({ ok: true });
}
