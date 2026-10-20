import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@libsql/client";
import { connect } from "../db/index.ts";
import { webhookEvents } from "../db/schema.ts";
import { getUserBySessionToken, markEmailVerified, registerUser } from "../app/lib/server/auth-store.ts";
import {
  PayPalClient,
  PayPalProvider,
  isTrustedCertUrl,
  mapPayPalStatus,
  verifyPayPalWebhook,
  type PayPalPlanMap,
  type WebhookHeaders,
} from "../app/lib/server/billing/paypal.ts";
import { BillingProviderError, fromCents, toCents } from "../app/lib/server/billing/provider.ts";
import { listTransactions, startCheckout } from "../app/lib/server/billing/service.ts";
import { processPayPalEvent } from "../app/lib/server/billing/webhooks.ts";
import { billedAmount } from "../app/lib/plans.ts";

const PLANS: PayPalPlanMap = {
  "student:monthly": "P-STUDENTMONTHLY01",
  "student:annual": "P-STUDENTANNUAL001",
  "pro:monthly": "P-PROMONTHLY00001",
  "pro:annual": "P-PROANNUAL000001",
  "institution:monthly": "P-INSTMONTHLY0001",
  "institution:annual": "P-INSTANNUAL00001",
};

type Call = { method: string; path: string; headers: Record<string, string>; body: string };

/**
 * Doble de la API REST de PayPal: registra cada llamada y responde según la
 * ruta. Mantiene suscripciones en memoria para simular su ciclo de vida.
 */
class FakePayPal {
  calls: Call[] = [];
  tokensIssued = 0;
  subscriptions = new Map<string, Record<string, unknown>>();
  verification = "SUCCESS";
  failNextWith401 = false;
  private seq = 0;

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = typeof init?.body === "string" ? init.body : "";
    const method = init?.method ?? "GET";
    this.calls.push({ method, path: url.pathname + url.search, headers, body });
    const reply = (status: number, payload?: unknown) =>
      new Response(payload === undefined ? null : JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

    if (url.pathname === "/v1/oauth2/token") {
      this.tokensIssued += 1;
      return reply(200, { access_token: `token-${this.tokensIssued}`, expires_in: 32_400 });
    }
    if (this.failNextWith401) {
      this.failNextWith401 = false;
      return reply(401, { name: "AUTHENTICATION_FAILURE", message: "expired" });
    }
    if (url.pathname === "/v1/notifications/verify-webhook-signature") {
      return reply(200, { verification_status: this.verification });
    }
    if (url.pathname === "/v1/billing/subscriptions" && method === "POST") {
      const request = JSON.parse(body) as { plan_id: string; custom_id: string };
      const id = `I-TEST${String(++this.seq).padStart(8, "0")}`;
      const subscription = { id, status: "APPROVAL_PENDING", plan_id: request.plan_id, custom_id: request.custom_id, links: [{ rel: "approve", href: `https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-${id}` }] };
      this.subscriptions.set(id, subscription);
      return reply(201, subscription);
    }
    const match = /^\/v1\/billing\/subscriptions\/([^/]+)(?:\/(\w+))?$/.exec(url.pathname);
    if (match) {
      const subscription = this.subscriptions.get(decodeURIComponent(match[1]));
      if (!subscription) return reply(404, { name: "RESOURCE_NOT_FOUND", message: "not found", debug_id: "dbg-404" });
      const action = match[2];
      if (!action) return reply(200, subscription);
      if (action === "cancel") subscription.status = "CANCELLED";
      if (action === "suspend") subscription.status = "SUSPENDED";
      if (action === "activate") subscription.status = "ACTIVE";
      if (action === "revise") return reply(200, { plan_id: JSON.parse(body).plan_id, links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/revise" }] });
      if (action === "transactions") {
        return reply(200, { transactions: [{ id: "TXN-1", status: "COMPLETED", time: "2026-10-08T10:00:00Z", amount_with_breakdown: { gross_amount: { currency_code: "MXN", value: "249.00" } } }] });
      }
      return reply(204);
    }
    return reply(404, { name: "NOT_FOUND" });
  };

  approve(id: string, overrides: Record<string, unknown> = {}) {
    Object.assign(this.subscriptions.get(id)!, { status: "ACTIVE", billing_info: { next_billing_time: "2026-11-08T10:00:00Z" } }, overrides);
  }
}

let credentialSeq = 0;
function makeProvider(api = new FakePayPal()) {
  // Credenciales únicas por prueba: la caché de tokens es por proceso.
  const client = new PayPalClient({ clientId: `client-${++credentialSeq}`, clientSecret: "secret", environment: "sandbox" }, api.fetch);
  return { api, client, provider: new PayPalProvider(client, PLANS) };
}

async function verifiedUser() {
  const db = await connect(createClient({ url: ":memory:" }));
  const registered = await registerUser(db, { name: "Ana", email: "ana@hospital.mx", password: "Anatomia2026", role: "residente", institution: null });
  assert.ok(registered.ok);
  await markEmailVerified(db, registered.user.id);
  const user = await getUserBySessionToken(db, registered.token);
  assert.ok(user);
  return { db, user, token: registered.token };
}

const URLS = { returnUrl: "https://atlas.test/cuenta?billing=return", cancelUrl: "https://atlas.test/cuenta?billing=abandoned", locale: "es-MX" };

test("money helpers convert exactly", () => {
  assert.equal(toCents("249.00"), 24_900);
  assert.equal(toCents("1999.9"), 199_990);
  assert.equal(toCents("-12.05"), -1_205);
  assert.ok(Number.isNaN(toCents("12,50")));
  assert.equal(fromCents(199_990), "1999.90");
});

test("PayPal statuses map to local states; unknown never grants access", () => {
  assert.equal(mapPayPalStatus("ACTIVE"), "authorized");
  assert.equal(mapPayPalStatus("SUSPENDED"), "paused");
  assert.equal(mapPayPalStatus("CANCELLED"), "cancelled");
  assert.equal(mapPayPalStatus("EXPIRED"), "cancelled");
  assert.equal(mapPayPalStatus("APPROVAL_PENDING"), "pending");
  assert.equal(mapPayPalStatus("APPROVED"), "pending");
  assert.equal(mapPayPalStatus("SOMETHING_NEW"), "pending");
});

test("OAuth token is cached and refreshed once after a 401", async () => {
  const { api, client } = makeProvider();
  await client.request("/v1/billing/subscriptions/I-NONE").catch(() => {});
  await client.request("/v1/billing/subscriptions/I-NONE").catch(() => {});
  assert.equal(api.tokensIssued, 1, "token reused");
  const tokenCall = api.calls.find((call) => call.path === "/v1/oauth2/token")!;
  assert.match(tokenCall.headers.authorization, /^Basic /);
  assert.equal(tokenCall.body, "grant_type=client_credentials");

  api.failNextWith401 = true;
  await client.request("/v1/billing/subscriptions/I-NONE").catch(() => {});
  assert.equal(api.tokensIssued, 2, "401 invalidates the cached token");
});

test("API errors surface status and debug_id", async () => {
  const { provider } = makeProvider();
  await assert.rejects(provider.getSubscription("I-MISSING"), (error: unknown) => {
    assert.ok(error instanceof BillingProviderError);
    assert.equal(error.status, 404);
    assert.equal(error.debugId, "dbg-404");
    return true;
  });
});

test("checkout creates a PayPal subscription with plan id, reference, trial and return URLs", async () => {
  const { api, provider } = makeProvider();
  const { db, user } = await verifiedUser();
  const now = Date.UTC(2026, 9, 1);
  const result = await startCheckout(db, provider, user, "pro", "monthly", URLS, now);

  assert.match(result.checkoutUrl, /^https:\/\/www\.sandbox\.paypal\.com\//);
  const create = api.calls.find((call) => call.method === "POST" && call.path === "/v1/billing/subscriptions")!;
  const body = JSON.parse(create.body);
  assert.equal(body.plan_id, PLANS["pro:monthly"]);
  assert.equal(body.custom_id, `${user.id}:pro:monthly`);
  assert.equal(body.start_time, new Date(now + 7 * 86_400_000).toISOString(), "trial defers the first charge");
  assert.equal(body.application_context.return_url, URLS.returnUrl);
  assert.equal(body.application_context.cancel_url, URLS.cancelUrl);
  assert.equal(body.application_context.shipping_preference, "NO_SHIPPING");
  assert.ok(create.headers["paypal-request-id"], "idempotency key sent");
  assert.match(create.headers.authorization, /^Bearer token-/);
});

test("an ACTIVE subscription on an unknown plan or foreign currency grants nothing", async () => {
  const { api, provider } = makeProvider();
  const { db, user } = await verifiedUser();
  const { subscriptionId } = await startCheckout(db, provider, user, "student", "monthly", URLS);
  api.approve(subscriptionId, { plan_id: "P-NOTOURS0000001" });
  assert.equal((await provider.getSubscription(subscriptionId)).status, "pending");
  api.approve(subscriptionId, { plan_id: PLANS["student:monthly"], billing_info: { last_payment: { amount: { currency_code: "USD", value: "7.00" }, time: "2026-10-01T00:00:00Z" } } });
  assert.equal((await provider.getSubscription(subscriptionId)).status, "pending");
  api.approve(subscriptionId, { plan_id: PLANS["student:monthly"], billing_info: { next_billing_time: "2026-11-01T00:00:00Z" } });
  const remote = await provider.getSubscription(subscriptionId);
  assert.equal(remote.status, "authorized");
  assert.deepEqual(remote.confirmedPlan, { plan: "student", cycle: "monthly" });
});

test("lifecycle transitions call PayPal and re-read the real state", async () => {
  const { api, provider } = makeProvider();
  const { db, user } = await verifiedUser();
  const { subscriptionId } = await startCheckout(db, provider, user, "pro", "annual", URLS);
  api.approve(subscriptionId);
  assert.equal((await provider.suspendSubscription(subscriptionId, "x")).status, "paused");
  assert.equal((await provider.activateSubscription(subscriptionId, "x")).status, "authorized");
  assert.equal((await provider.cancelSubscription(subscriptionId, "x".repeat(300))).status, "cancelled");
  const cancelCall = api.calls.find((call) => call.path.endsWith("/cancel"))!;
  assert.equal(JSON.parse(cancelCall.body).reason.length, 127, "reason trimmed to PayPal's limit");
  const revise = await provider.reviseSubscription(subscriptionId, { plan: "student", cycle: "annual", ...URLS });
  assert.match(revise.approvalUrl, /revise/);
  const transactions = await provider.listTransactions(subscriptionId, new Date(0), new Date());
  assert.deepEqual(transactions.map((t) => [t.id, t.amountCents, t.currency, t.kind]), [["TXN-1", 24_900, "MXN", "payment"]]);
});

const HEADERS: WebhookHeaders = {
  transmissionId: "tx-1",
  transmissionTime: "2026-10-08T10:00:00Z",
  transmissionSig: "sig",
  certUrl: "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
  authAlgo: "SHA256withRSA",
};

test("webhook verification forwards the raw event bytes and rejects bad input locally", async () => {
  const { api, client } = makeProvider();
  const now = Date.parse(HEADERS.transmissionTime!);
  const rawBody = '{"id":"WH-1","event_type":"BILLING.SUBSCRIPTION.ACTIVATED",  "resource":{"id":"I-1"}}';
  assert.equal(await verifyPayPalWebhook(client, { headers: HEADERS, webhookId: "WHID", rawBody, now }), true);
  const call = api.calls.find((c) => c.path === "/v1/notifications/verify-webhook-signature")!;
  assert.ok(call.body.endsWith(`"webhook_event":${rawBody}}`), "original bytes, not re-serialized");
  assert.equal(JSON.parse(call.body).webhook_id, "WHID");

  api.verification = "FAILURE";
  assert.equal(await verifyPayPalWebhook(client, { headers: HEADERS, webhookId: "WHID", rawBody, now }), false);

  const before = api.calls.length;
  assert.equal(await verifyPayPalWebhook(client, { headers: { ...HEADERS, certUrl: "https://evil.example/cert" }, webhookId: "WHID", rawBody, now }), false);
  assert.equal(await verifyPayPalWebhook(client, { headers: { ...HEADERS, transmissionSig: null }, webhookId: "WHID", rawBody, now }), false);
  assert.equal(await verifyPayPalWebhook(client, { headers: HEADERS, webhookId: "WHID", rawBody, now: now + 3 * 86_400_000 }), false, "stale replay");
  assert.equal(await verifyPayPalWebhook(client, { headers: HEADERS, webhookId: "WHID", rawBody: "{oops", now }), false);
  assert.equal(api.calls.length, before, "rejected without calling PayPal");
});

test("cert URL must be HTTPS on a PayPal host", () => {
  assert.equal(isTrustedCertUrl("https://api.paypal.com/v1/notifications/certs/X"), true);
  assert.equal(isTrustedCertUrl("https://api.sandbox.paypal.com/v1/notifications/certs/X"), true);
  assert.equal(isTrustedCertUrl("http://api.paypal.com/x"), false);
  assert.equal(isTrustedCertUrl("https://paypal.com.evil.mx/x"), false);
  assert.equal(isTrustedCertUrl(null), false);
});

test("webhooks are idempotent, order-independent and record payments", async () => {
  const { api, provider } = makeProvider();
  const { db, user, token } = await verifiedUser();
  const { subscriptionId } = await startCheckout(db, provider, user, "pro", "monthly", URLS);

  // El cobro llega antes que la activación (fuera de orden).
  api.approve(subscriptionId);
  const sale = {
    id: "WH-SALE-1",
    event_type: "PAYMENT.SALE.COMPLETED",
    create_time: "2026-10-08T10:00:00Z",
    resource: { id: "SALE-1", state: "completed", billing_agreement_id: subscriptionId, amount: { total: `${billedAmount("pro", "monthly")}.00`, currency: "MXN" }, create_time: "2026-10-08T10:00:00Z" },
  };
  assert.equal(await processPayPalEvent(db, provider, sale), "processed");
  assert.equal(await processPayPalEvent(db, provider, sale), "duplicate");
  assert.equal((await getUserBySessionToken(db, token))?.plan, "pro");

  // Un CREATED tardío no puede revertir el estado: se reconsulta a PayPal.
  assert.equal(await processPayPalEvent(db, provider, { id: "WH-OLD", event_type: "BILLING.SUBSCRIPTION.CREATED", resource: { id: subscriptionId, status: "APPROVAL_PENDING" } }), "processed");
  assert.equal((await getUserBySessionToken(db, token))?.plan, "pro");

  // Reembolso enlazado a la venta original sin billing_agreement_id.
  const refund = { id: "WH-REFUND-1", event_type: "PAYMENT.SALE.REFUNDED", resource: { id: "REFUND-1", sale_id: "SALE-1", state: "completed", amount: { total: "249.00", currency: "MXN" } } };
  assert.equal(await processPayPalEvent(db, provider, refund), "processed");
  const history = await listTransactions(db, user.id);
  assert.deepEqual(history.map((row) => [row.id, row.kind, row.relatedId]).sort(), [["REFUND-1", "refund", "SALE-1"], ["SALE-1", "payment", null]]);

  // Cancelación desde PayPal: conserva el acceso hasta el fin del periodo.
  api.subscriptions.get(subscriptionId)!.status = "CANCELLED";
  assert.equal(await processPayPalEvent(db, provider, { id: "WH-CANCEL", event_type: "BILLING.SUBSCRIPTION.CANCELLED", resource: { id: subscriptionId } }), "processed");
  assert.equal((await getUserBySessionToken(db, token, Date.parse("2026-11-01T00:00:00Z")))?.plan, "pro");
  assert.equal((await getUserBySessionToken(db, token, Date.parse("2026-11-09T00:00:00Z")))?.plan, "free");

  const stored = await db.select().from(webhookEvents).all();
  assert.equal(stored.length, 4);
  assert.ok(stored.every((row) => row.status === "processed"));
});

test("webhook events for foreign subscriptions or unknown types are ignored, failures retry", async () => {
  const { api, provider } = makeProvider();
  const { db } = await verifiedUser();
  api.subscriptions.set("I-FOREIGN0001", { id: "I-FOREIGN0001", status: "ACTIVE", plan_id: PLANS["pro:monthly"], custom_id: "someone-else:pro:monthly" });
  assert.equal(await processPayPalEvent(db, provider, { id: "WH-F", event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: "I-FOREIGN0001" } }), "ignored");
  assert.equal(await processPayPalEvent(db, provider, { id: "WH-X", event_type: "CUSTOMER.DISPUTE.CREATED", resource: {} }), "ignored");
  assert.equal(await processPayPalEvent(db, provider, { event_type: "BILLING.SUBSCRIPTION.ACTIVATED" }), "ignored");

  await assert.rejects(processPayPalEvent(db, provider, { id: "WH-ERR", event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: "I-MISSING0001" } }));
  const failed = (await db.select().from(webhookEvents).all()).find((row) => row.id === "WH-ERR");
  assert.equal(failed?.status, "failed");
  await assert.rejects(processPayPalEvent(db, provider, { id: "WH-ERR", event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: "I-MISSING0001" } }));
  assert.equal((await db.select().from(webhookEvents).all()).find((row) => row.id === "WH-ERR")?.attempts, 2, "a failed event is retried, not treated as duplicate");
});
