import { CURRENCY, PAID_PLAN_IDS, type BillingCycle, type PaidPlanId } from "../../plans";
import {
  BillingProviderError,
  toCents,
  type BillingProvider,
  type CreateSubscriptionInput,
  type CreatedSubscription,
  type RemotePayment,
  type RemoteSubscription,
  type RemoteTransaction,
  type RevisionInput,
} from "./provider";
import type { SubscriptionStatus } from "../../../../db/schema";

/**
 * Cliente de PayPal Subscriptions (REST v1) sobre `fetch`.
 *
 * No se usa el SDK de servidor porque depende de APIs de Node y la app también
 * corre en Cloudflare Workers. Autenticación servidor a servidor con OAuth2
 * `client_credentials`; el token se reutiliza hasta un minuto antes de expirar.
 *
 * Referencias: https://developer.paypal.com/docs/api/subscriptions/v1/ y
 * https://developer.paypal.com/api/rest/authentication/
 */

export type PayPalEnvironment = "sandbox" | "live";

export const PAYPAL_API_BASE: Record<PayPalEnvironment, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

/** Clave `plan:ciclo` → id de plan de PayPal (`P-…`). */
export type PlanKey = `${PaidPlanId}:${BillingCycle}`;
export type PayPalPlanMap = Partial<Record<PlanKey, string>>;

export const PLAN_KEYS: readonly PlanKey[] = PAID_PLAN_IDS.flatMap((plan) => [`${plan}:monthly`, `${plan}:annual`] as PlanKey[]);

export type PayPalCredentials = {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
};

const TIMEOUT_MS = 15_000;
const TOKEN_SAFETY_MS = 60_000;

type Link = { href: string; rel: string; method?: string };

export type PayPalSubscriptionPayload = {
  id?: string;
  status?: string;
  plan_id?: string;
  custom_id?: string;
  start_time?: string;
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { amount?: { currency_code?: string; value?: string }; time?: string };
  };
  links?: Link[];
};

type PayPalTransactionPayload = {
  id?: string;
  status?: string;
  time?: string;
  amount_with_breakdown?: { gross_amount?: { currency_code?: string; value?: string } };
};

type PayPalErrorPayload = { name?: string; message?: string; debug_id?: string; error_description?: string };

type CachedToken = { value: string; expiresAt: number };
// Compartido por credenciales dentro del proceso/isolate.
const TOKEN_KEY = Symbol.for("atlas-anatomico.paypal-token");
const tokenCache: Map<string, CachedToken> = ((globalThis as Record<symbol, unknown>)[TOKEN_KEY] ??= new Map()) as Map<string, CachedToken>;

/** Estados de PayPal → estados locales. Desconocido = pendiente (nunca otorga acceso). */
export function mapPayPalStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case "ACTIVE":
      return "authorized";
    case "SUSPENDED":
      return "paused";
    case "CANCELLED":
    case "EXPIRED":
      return "cancelled";
    default:
      return "pending";
  }
}

function parseTime(value: string | undefined | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function base64(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)));
}

export class PayPalClient {
  readonly baseUrl: string;

  constructor(
    private readonly credentials: PayPalCredentials,
    private readonly fetchImpl: typeof fetch = (input, init) => fetch(input, init),
  ) {
    this.baseUrl = PAYPAL_API_BASE[credentials.environment];
  }

  private cacheKey() {
    return `${this.credentials.environment}:${this.credentials.clientId}`;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      throw new BillingProviderError(`No se pudo contactar a PayPal: ${(error as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async accessToken(now = Date.now()): Promise<string> {
    const cached = tokenCache.get(this.cacheKey());
    if (cached && cached.expiresAt > now) return cached.value;
    const response = await this.fetchWithTimeout(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64(`${this.credentials.clientId}:${this.credentials.clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });
    const payload = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number } & PayPalErrorPayload;
    if (!response.ok || !payload.access_token) {
      throw new BillingProviderError(`PayPal OAuth ${response.status}: ${payload.error_description ?? payload.message ?? "sin token"}`, response.status);
    }
    const ttlMs = Math.max(0, (payload.expires_in ?? 0) * 1000 - TOKEN_SAFETY_MS);
    tokenCache.set(this.cacheKey(), { value: payload.access_token, expiresAt: now + ttlMs });
    return payload.access_token;
  }

  /** Llamada autenticada. Un 401 invalida el token en caché y se reintenta una vez. */
  async request<T>(path: string, init: { method?: string; body?: unknown; rawBody?: string; requestId?: string } = {}, retried = false): Promise<T> {
    const token = await this.accessToken();
    const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation",
        ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
      },
      body: init.rawBody ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    });
    if (response.status === 401 && !retried) {
      tokenCache.delete(this.cacheKey());
      return this.request<T>(path, init, true);
    }
    if (response.status === 204) return {} as T;
    const payload = (await response.json().catch(() => ({}))) as T & PayPalErrorPayload;
    if (!response.ok) {
      throw new BillingProviderError(
        `PayPal ${response.status} ${payload.name ?? ""}: ${payload.message ?? "error desconocido"}`.trim(),
        response.status,
        payload.debug_id,
      );
    }
    return payload;
  }
}

function approveLink(links: Link[] | undefined): string | null {
  return links?.find((link) => link.rel === "approve")?.href ?? null;
}

function lastPaymentOf(payload: PayPalSubscriptionPayload): RemotePayment | null {
  const last = payload.billing_info?.last_payment;
  const at = parseTime(last?.time);
  if (!last?.amount?.value || !last.amount.currency_code || at === null) return null;
  return { amountCents: toCents(last.amount.value), currency: last.amount.currency_code, at };
}

export class PayPalProvider implements BillingProvider {
  readonly name = "paypal" as const;
  private readonly planByPayPalId: Map<string, { plan: PaidPlanId; cycle: BillingCycle }>;

  constructor(
    readonly client: PayPalClient,
    private readonly plans: PayPalPlanMap,
    private readonly brandName = "Atlas Anatómico",
  ) {
    this.planByPayPalId = new Map();
    for (const key of PLAN_KEYS) {
      const id = plans[key];
      if (!id) continue;
      const [plan, cycle] = key.split(":") as [PaidPlanId, BillingCycle];
      this.planByPayPalId.set(id, { plan, cycle });
    }
  }

  private planIdFor(plan: PaidPlanId, cycle: BillingCycle): string {
    const id = this.plans[`${plan}:${cycle}`];
    if (!id) throw new BillingProviderError(`No hay un plan de PayPal configurado para ${plan}:${cycle}.`);
    return id;
  }

  toRemote(payload: PayPalSubscriptionPayload): RemoteSubscription {
    if (!payload.id) throw new BillingProviderError("Respuesta de PayPal sin id de suscripción.");
    const lastPayment = lastPaymentOf(payload);
    let status = mapPayPalStatus(payload.status);
    const confirmedPlan = payload.plan_id ? (this.planByPayPalId.get(payload.plan_id) ?? null) : null;
    // Solo se confía en un plan propio y en cobros en la moneda pactada. Cualquier
    // otra cosa se trata como pendiente: nunca otorga acceso.
    if (status === "authorized" && (!confirmedPlan || (lastPayment && lastPayment.currency !== CURRENCY))) {
      console.error("[billing] suscripción de PayPal con plan o moneda no reconocidos", payload.id, payload.plan_id, lastPayment?.currency);
      status = "pending";
    }
    return {
      id: payload.id,
      status,
      externalReference: payload.custom_id ?? "",
      nextPaymentAt: parseTime(payload.billing_info?.next_billing_time),
      confirmedPlan,
      lastPayment,
    };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<CreatedSubscription> {
    const payload = await this.client.request<PayPalSubscriptionPayload>("/v1/billing/subscriptions", {
      method: "POST",
      requestId: input.requestId,
      body: {
        plan_id: this.planIdFor(input.plan, input.cycle),
        custom_id: input.externalReference,
        ...(input.startDate ? { start_time: input.startDate.toISOString() } : {}),
        subscriber: { email_address: input.payerEmail },
        application_context: {
          brand_name: this.brandName,
          locale: input.locale,
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      },
    });
    const checkoutUrl = approveLink(payload.links);
    if (!checkoutUrl) throw new BillingProviderError("PayPal no devolvió el enlace de aprobación.");
    return { ...this.toRemote(payload), checkoutUrl };
  }

  async getSubscription(id: string): Promise<RemoteSubscription> {
    return this.toRemote(await this.client.request<PayPalSubscriptionPayload>(`/v1/billing/subscriptions/${encodeURIComponent(id)}`));
  }

  private async transition(id: string, action: "cancel" | "suspend" | "activate", reason: string): Promise<RemoteSubscription> {
    await this.client.request(`/v1/billing/subscriptions/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      body: { reason: reason.slice(0, 127) },
    });
    // Las transiciones responden 204: el estado real se vuelve a consultar.
    return this.getSubscription(id);
  }

  cancelSubscription(id: string, reason: string) {
    return this.transition(id, "cancel", reason);
  }

  suspendSubscription(id: string, reason: string) {
    return this.transition(id, "suspend", reason);
  }

  activateSubscription(id: string, reason: string) {
    return this.transition(id, "activate", reason);
  }

  async reviseSubscription(id: string, input: RevisionInput): Promise<{ approvalUrl: string }> {
    const payload = await this.client.request<{ links?: Link[] }>(`/v1/billing/subscriptions/${encodeURIComponent(id)}/revise`, {
      method: "POST",
      body: {
        plan_id: this.planIdFor(input.plan, input.cycle),
        application_context: {
          brand_name: this.brandName,
          locale: input.locale,
          shipping_preference: "NO_SHIPPING",
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      },
    });
    const approvalUrl = approveLink(payload.links);
    if (!approvalUrl) throw new BillingProviderError("PayPal no devolvió el enlace de aprobación del cambio de plan.");
    return { approvalUrl };
  }

  async listTransactions(id: string, since: Date, until: Date): Promise<RemoteTransaction[]> {
    const query = new URLSearchParams({ start_time: since.toISOString(), end_time: until.toISOString() });
    const payload = await this.client.request<{ transactions?: PayPalTransactionPayload[] }>(
      `/v1/billing/subscriptions/${encodeURIComponent(id)}/transactions?${query}`,
    );
    const result: RemoteTransaction[] = [];
    for (const transaction of payload.transactions ?? []) {
      const gross = transaction.amount_with_breakdown?.gross_amount;
      const occurredAt = parseTime(transaction.time);
      if (!transaction.id || !gross?.value || !gross.currency_code || occurredAt === null) continue;
      const status = (transaction.status ?? "").toLowerCase();
      result.push({
        id: transaction.id,
        subscriptionId: id,
        kind: status.includes("refund") ? "refund" : status.includes("reversed") ? "reversal" : "payment",
        status,
        amountCents: toCents(gross.value),
        currency: gross.currency_code,
        relatedId: null,
        occurredAt,
      });
    }
    return result;
  }
}

export type WebhookHeaders = {
  transmissionId: string | null;
  transmissionTime: string | null;
  transmissionSig: string | null;
  certUrl: string | null;
  authAlgo: string | null;
};

export function readWebhookHeaders(headers: Headers): WebhookHeaders {
  return {
    transmissionId: headers.get("paypal-transmission-id"),
    transmissionTime: headers.get("paypal-transmission-time"),
    transmissionSig: headers.get("paypal-transmission-sig"),
    certUrl: headers.get("paypal-cert-url"),
    authAlgo: headers.get("paypal-auth-algo"),
  };
}

/** El certificado de firma solo puede venir de un host de PayPal por HTTPS. */
export function isTrustedCertUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "api.paypal.com" || url.hostname === "api.sandbox.paypal.com" || url.hostname.endsWith(".paypal.com"));
  } catch {
    return false;
  }
}

/** Ventana máxima aceptada entre la transmisión y la recepción (anti-replay). */
export const WEBHOOK_TOLERANCE_MS = 24 * 60 * 60 * 1000;

/**
 * Verificación criptográfica delegada en PayPal
 * (`POST /v1/notifications/verify-webhook-signature`). El evento se reenvía
 * con sus bytes originales: re-serializar el JSON alteraría la firma.
 */
export async function verifyPayPalWebhook(
  client: PayPalClient,
  options: { headers: WebhookHeaders; webhookId: string; rawBody: string; now?: number },
): Promise<boolean> {
  const { headers } = options;
  if (!headers.transmissionId || !headers.transmissionTime || !headers.transmissionSig || !headers.authAlgo) return false;
  if (!isTrustedCertUrl(headers.certUrl)) return false;
  const sentAt = parseTime(headers.transmissionTime);
  if (sentAt === null || Math.abs((options.now ?? Date.now()) - sentAt) > WEBHOOK_TOLERANCE_MS) return false;
  try {
    JSON.parse(options.rawBody);
  } catch {
    return false;
  }
  const envelope = [
    `"auth_algo":${JSON.stringify(headers.authAlgo)}`,
    `"cert_url":${JSON.stringify(headers.certUrl)}`,
    `"transmission_id":${JSON.stringify(headers.transmissionId)}`,
    `"transmission_sig":${JSON.stringify(headers.transmissionSig)}`,
    `"transmission_time":${JSON.stringify(headers.transmissionTime)}`,
    `"webhook_id":${JSON.stringify(options.webhookId)}`,
    `"webhook_event":${options.rawBody}`,
  ].join(",");
  const result = await client.request<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    rawBody: `{${envelope}}`,
  });
  return result.verification_status === "SUCCESS";
}
