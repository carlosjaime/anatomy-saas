import { normalizeStatus } from "./entitlement";
import {
  BillingProviderError,
  type BillingProvider,
  type CreateSubscriptionInput,
  type CreatedSubscription,
  type RemoteSubscription,
} from "./provider";

/**
 * Cliente de Suscripciones de Mercado Pago (`/preapproval`) sobre `fetch`.
 * No se usa el SDK oficial porque depende de `crypto`/`Buffer` de Node y no
 * corre en Cloudflare Workers; los contratos replican los de su SDK v3.
 */

const BASE_URL = "https://api.mercadopago.com";
const TIMEOUT_MS = 10_000;

type PreapprovalPayload = {
  id?: string;
  status?: string;
  external_reference?: string;
  init_point?: string;
  next_payment_date?: string | null;
  message?: string;
};

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function toRemote(payload: PreapprovalPayload): RemoteSubscription {
  if (!payload.id) throw new BillingProviderError("Respuesta de Mercado Pago sin id de suscripción.");
  return {
    id: payload.id,
    status: normalizeStatus(payload.status),
    externalReference: payload.external_reference ?? "",
    nextPaymentAt: parseDate(payload.next_payment_date),
  };
}

export class MercadoPagoProvider implements BillingProvider {
  readonly name = "mercadopago" as const;

  constructor(
    private readonly accessToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(`${BASE_URL}${path}`, {
        method: init.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
      if (!response.ok) {
        throw new BillingProviderError(`Mercado Pago ${response.status}: ${payload.message ?? "error desconocido"}`, response.status);
      }
      return payload;
    } catch (error) {
      if (error instanceof BillingProviderError) throw error;
      throw new BillingProviderError(`No se pudo contactar a Mercado Pago: ${(error as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<CreatedSubscription> {
    const payload = await this.request<PreapprovalPayload>("/preapproval", {
      method: "POST",
      idempotencyKey: crypto.randomUUID(),
      body: {
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: input.backUrl,
        status: "pending",
        auto_recurring: {
          frequency: input.frequencyMonths,
          frequency_type: "months",
          transaction_amount: input.amount,
          currency_id: "MXN",
          ...(input.startDate ? { start_date: input.startDate.toISOString() } : {}),
        },
      },
    });
    if (!payload.init_point) throw new BillingProviderError("Mercado Pago no devolvió el enlace de pago.");
    return { ...toRemote(payload), checkoutUrl: payload.init_point };
  }

  async getSubscription(id: string): Promise<RemoteSubscription> {
    return toRemote(await this.request<PreapprovalPayload>(`/preapproval/${encodeURIComponent(id)}`));
  }

  async cancelSubscription(id: string): Promise<RemoteSubscription> {
    return toRemote(
      await this.request<PreapprovalPayload>(`/preapproval/${encodeURIComponent(id)}`, { method: "PUT", body: { status: "cancelled" } }),
    );
  }

  async subscriptionIdForPayment(paymentId: string): Promise<string | null> {
    const payload = await this.request<{ preapproval_id?: string }>(`/authorized_payments/${encodeURIComponent(paymentId)}`);
    return payload.preapproval_id ?? null;
  }
}
