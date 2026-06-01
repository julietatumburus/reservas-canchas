import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

type ClubDepositCfg = {
  depositMode: "NONE" | "FIXED" | "PERCENT";
  depositAmountCents: number;
  depositPercent: number;
};

/** Calcula el monto de la seña según la config del club. */
export function computeDeposit(priceCents: number, club: ClubDepositCfg): number {
  if (club.depositMode === "FIXED") {
    return Math.min(Math.max(0, club.depositAmountCents), priceCents);
  }
  if (club.depositMode === "PERCENT") {
    const pct = Math.max(0, Math.min(100, club.depositPercent));
    return Math.round((priceCents * pct) / 100);
  }
  return 0;
}

function getMpClient(): MercadoPagoConfig | null {
  // MVP: token único de plataforma. Más adelante se puede usar Club.mpAccessToken
  // por club (MercadoPago Marketplace).
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return null;
  return new MercadoPagoConfig({ accessToken: token });
}

export type CreatePreferenceArgs = {
  paymentId: string; // nuestra Payment.id (external_reference)
  amountCents: number;
  description: string;
  successUrl: string;
  failureUrl: string;
  notificationUrl: string;
};

export async function createMpPreference(
  args: CreatePreferenceArgs,
): Promise<{ initPoint: string; preferenceId: string } | null> {
  const client = getMpClient();
  if (!client) return null;

  const pref = new Preference(client);
  const result = await pref.create({
    body: {
      items: [
        {
          id: args.paymentId,
          title: args.description,
          quantity: 1,
          currency_id: "ARS",
          unit_price: args.amountCents / 100,
        },
      ],
      external_reference: args.paymentId,
      back_urls: {
        success: args.successUrl,
        failure: args.failureUrl,
        pending: args.successUrl,
      },
      auto_return: "approved",
      notification_url: args.notificationUrl,
    },
  });

  if (!result.init_point || !result.id) return null;
  return { initPoint: result.init_point, preferenceId: String(result.id) };
}

export async function fetchMpPayment(mpPaymentId: string): Promise<{
  status: string;
  externalReference: string | null;
} | null> {
  const client = getMpClient();
  if (!client) return null;
  const pay = new Payment(client);
  const result = await pay.get({ id: mpPaymentId });
  return {
    status: result.status ?? "unknown",
    externalReference: result.external_reference ?? null,
  };
}

/** Mapeo del status de MP a nuestro enum PaymentStatus. */
export function mapMpStatus(
  mp: string,
): "APPROVED" | "REJECTED" | "REFUNDED" | "CANCELLED" | "PENDING" {
  switch (mp) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}
