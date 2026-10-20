import type { Database } from "../../../../db";
import { localeFromRequest } from "../../../i18n/server";
import { consumeAttempt } from "../auth-store";
import { appUrl } from "../config";
import type { BillingProvider } from "./provider";
import { BillingError, getBillingProvider, type CheckoutUrls } from "./service";

/** Utilidades compartidas por las rutas `/api/billing/*`. */

/** Operaciones de facturación por usuario en la ventana de abajo. */
export const BILLING_RATE_LIMIT = 10;
export const BILLING_RATE_WINDOW_MS = 10 * 60 * 1000;

export function requireProvider(): BillingProvider {
  const provider = getBillingProvider();
  if (!provider) throw new BillingError("not_configured");
  return provider;
}

/** Retorno a la cuenta tras aprobar o abandonar la aprobación en el procesador. */
export function checkoutUrls(request: Request): CheckoutUrls {
  const base = appUrl(request);
  return {
    returnUrl: `${base}/cuenta?billing=return`,
    cancelUrl: `${base}/cuenta?billing=abandoned`,
    locale: localeFromRequest(request),
  };
}

/** Limita las mutaciones de facturación por usuario (protege la cuota de la API del procesador). */
export async function assertBillingRate(db: Database, userId: string, now = Date.now()): Promise<void> {
  const waitMs = await consumeAttempt(db, `billing:${userId}`, now, BILLING_RATE_LIMIT, BILLING_RATE_WINDOW_MS);
  if (waitMs > 0) throw new BillingError("rate_limited");
}

/** Ids de suscripción aceptados en la URL: PayPal `I-…` o demo. */
export function isSubscriptionId(value: unknown): value is string {
  return typeof value === "string" && /^(I-[A-Z0-9]{6,32}|demo_[0-9a-f-]{36})$/.test(value);
}
