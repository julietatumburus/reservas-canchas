import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { fetchMpPayment, mapMpStatus } from "@/lib/payments";

// Webhook público de MercadoPago. Recibe notificaciones de cambios de pago,
// consulta el detalle del pago contra la API de MP y actualiza Payment + Booking
// en nuestra DB. Si MP_WEBHOOK_SECRET está configurado, verifica la firma HMAC
// (recomendado para producción).

/**
 * Verifica la firma del webhook según el esquema de MercadoPago:
 *   x-signature: ts=<timestamp>,v1=<hex>
 *   x-request-id: <uuid>
 * manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * v1 = HMAC-SHA256(manifest, secret)
 */
function verifySignature(
  request: Request,
  mpPaymentId: string,
  secret: string,
): boolean {
  const sigHeader = request.headers.get("x-signature");
  const reqIdHeader = request.headers.get("x-request-id");
  if (!sigHeader || !reqIdHeader) return false;

  const parts: Record<string, string> = {};
  for (const piece of sigHeader.split(",")) {
    const [k, v] = piece.split("=").map((s) => s.trim());
    if (k && v) parts[k] = v;
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${mpPaymentId};request-id:${reqIdHeader};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(v1, "hex"),
    );
  } catch {
    return false;
  }
}

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
      const b = body as {
        type?: string;
        data?: { id?: string | number };
        id?: string | number;
      };
      if (b.type === "payment" && b.data?.id !== undefined)
        mpPaymentId = String(b.data.id);
      else if (b.id !== undefined) mpPaymentId = String(b.id);
    }
  } catch {
    // body inválido -> ignorar
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret && mpPaymentId) {
    if (!verifySignature(request, mpPaymentId, secret)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  await handle(mpPaymentId);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const topic = url.searchParams.get("topic") ?? url.searchParams.get("type");
  const id = url.searchParams.get("id") ?? url.searchParams.get("data.id");
  if (topic !== "payment") return NextResponse.json({ ok: true });

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret && id) {
    if (!verifySignature(request, id, secret)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  await handle(id);
  return NextResponse.json({ ok: true });
}
