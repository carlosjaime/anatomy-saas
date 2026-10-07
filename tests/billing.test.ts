import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createClient } from "@libsql/client";
import { connect, type Database } from "../db/index.ts";
import { MIGRATIONS, migrate } from "../db/migrations.ts";
import { subscriptions } from "../db/schema.ts";
import { getUserBySessionToken, markEmailVerified, registerUser } from "../app/lib/server/auth-store.ts";
import { effectivePlan, planGrantedBy } from "../app/lib/server/billing/entitlement.ts";
import type { BillingProvider, CreateSubscriptionInput, RemoteSubscription } from "../app/lib/server/billing/provider.ts";
import {
  BillingError,
  cancelActiveSubscription,
  decodeReference,
  encodeReference,
  getBillingSummary,
  startCheckout,
  syncSubscription,
} from "../app/lib/server/billing/service.ts";
import { verifyWebhookSignature } from "../app/lib/server/billing/webhook-signature.ts";
import { consumeEmailToken, issueEmailToken } from "../app/lib/server/email-tokens.ts";
import { billedAmount } from "../app/lib/plans.ts";

const DAY = 86_400_000;

/** Proveedor falso que imita el ciclo de vida de una preapproval. */
class FakeProvider implements BillingProvider {
  readonly name = "mercadopago" as const;
  remote = new Map<string, RemoteSubscription>();
  created: CreateSubscriptionInput[] = [];
  private seq = 0;

  async createSubscription(input: CreateSubscriptionInput) {
    const id = `pre_${++this.seq}`;
    const remote: RemoteSubscription = { id, status: "pending", externalReference: input.externalReference, nextPaymentAt: null };
    this.remote.set(id, remote);
    this.created.push(input);
    return { ...remote, checkoutUrl: `https://mp.test/checkout/${id}` };
  }
  async getSubscription(id: string) {
    const remote = this.remote.get(id);
    if (!remote) throw new Error("not found");
    return remote;
  }
  async cancelSubscription(id: string) {
    const remote = { ...(await this.getSubscription(id)), status: "cancelled" as const };
    this.remote.set(id, remote);
    return remote;
  }
  async subscriptionIdForPayment() {
    return null;
  }
  /** Simula que el usuario completó el pago en Mercado Pago. */
  authorize(id: string, nextPaymentAt: number) {
    this.remote.set(id, { ...this.remote.get(id)!, status: "authorized", nextPaymentAt });
  }
}

async function setup() {
  const db: Database = await connect(createClient({ url: ":memory:" }));
  const registered = await registerUser(db, {
    name: "Ana Pérez",
    email: "ana@hospital.mx",
    password: "Anatomia2026",
    role: "residente",
    institution: null,
  });
  assert.ok(registered.ok);
  return { db, user: registered.user, token: registered.token, provider: new FakeProvider() };
}

async function sessionUser(db: Database, token: string, now = Date.now()) {
  const user = await getUserBySessionToken(db, token, now);
  assert.ok(user);
  return user;
}

test("migrations upgrade a v1 database in place and are idempotent", async () => {
  const client = createClient({ url: ":memory:" });
  const run = { run: async (sql: string) => void (await client.execute(sql)), appliedVersions: async () => (await client.execute("SELECT version FROM schema_migrations")).rows.map((r) => Number(r.version)) };
  assert.deepEqual(await migrate(run, MIGRATIONS.slice(0, 1)), [1]);
  await client.execute("INSERT INTO users (id,email,name,password_hash,role,plan,created_at) VALUES ('u1','a@b.mx','A','x','otro','free',1)");
  assert.deepEqual(await migrate(run), [2]);
  assert.deepEqual(await migrate(run), []);
  const row = (await client.execute("SELECT trial_used, email_verified_at FROM users WHERE id = 'u1'")).rows[0];
  assert.equal(Number(row.trial_used), 0, "existing users get the trial");
  assert.equal(row.email_verified_at, null);
});

test("checkout requires a verified email and a paid plan", async () => {
  const { db, token, provider } = await setup();
  const user = await sessionUser(db, token);
  await assert.rejects(startCheckout(db, provider, user, "pro", "monthly", "https://app/cuenta"), (e: unknown) => e instanceof BillingError && e.code === "email_unverified");
  await markEmailVerified(db, user.id);
  const verified = await sessionUser(db, token);
  await assert.rejects(startCheckout(db, provider, verified, "free", "monthly", "https://app/cuenta"), (e: unknown) => e instanceof BillingError && e.code === "invalid_plan");
});

test("trial checkout → authorization → plan active, trial consumed once", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const user = await sessionUser(db, token);
  const now = Date.UTC(2026, 9, 7);

  const checkout = await startCheckout(db, provider, user, "pro", "annual", "https://app/cuenta", now);
  assert.equal(checkout.trialDays, 7);
  assert.equal(provider.created[0].amount, billedAmount("pro", "annual"));
  assert.equal(provider.created[0].frequencyMonths, 12);
  assert.equal(provider.created[0].startDate?.getTime(), now + 7 * DAY, "first charge deferred by the trial");
  assert.equal(decodeReference(provider.created[0].externalReference)?.userId, user.id);

  assert.equal((await sessionUser(db, token, now)).plan, "free", "pending checkout grants nothing");
  provider.authorize(checkout.subscriptionId, now + 7 * DAY);
  await syncSubscription(db, provider, checkout.subscriptionId, { now });
  await syncSubscription(db, provider, checkout.subscriptionId, { now }); // idempotent
  const active = await sessionUser(db, token, now);
  assert.equal(active.plan, "pro");
  assert.equal(active.trialAvailable, false);

  const second = await startCheckout(db, provider, active, "student", "monthly", "https://app/cuenta", now);
  assert.equal(second.trialDays, 0, "no second trial");
  assert.equal(provider.created[1].startDate, null);
});

test("changing plan cancels the previous subscription once the new one is authorized", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const now = Date.now();
  const first = await startCheckout(db, provider, await sessionUser(db, token), "student", "monthly", "https://app", now);
  provider.authorize(first.subscriptionId, now + 30 * DAY);
  await syncSubscription(db, provider, first.subscriptionId, { now });

  const upgrade = await startCheckout(db, provider, await sessionUser(db, token), "pro", "monthly", "https://app", now);
  provider.authorize(upgrade.subscriptionId, now + 30 * DAY);
  await syncSubscription(db, provider, upgrade.subscriptionId, { now });

  assert.equal(provider.remote.get(first.subscriptionId)?.status, "cancelled");
  assert.equal((await sessionUser(db, token, now)).plan, "pro");
});

test("cancellation keeps access until the paid period ends", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const now = Date.UTC(2026, 9, 1);
  const checkout = await startCheckout(db, provider, await sessionUser(db, token), "student", "monthly", "https://app", now);
  const periodEnd = now + 30 * DAY;
  provider.authorize(checkout.subscriptionId, periodEnd);
  await syncSubscription(db, provider, checkout.subscriptionId, { now });

  const cancelled = await cancelActiveSubscription(db, provider, (await sessionUser(db, token)).id, now + DAY);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.accessUntil, periodEnd);
  assert.equal((await sessionUser(db, token, periodEnd - 1)).plan, "student");
  assert.equal((await sessionUser(db, token, periodEnd + 1)).plan, "free");
  assert.equal((await getBillingSummary(db, cancelled.userId, periodEnd + 1)).current, null);
});

test("an abandoned trial checkout that gets cancelled grants no access", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const now = Date.now();
  const checkout = await startCheckout(db, provider, await sessionUser(db, token), "pro", "monthly", "https://app", now);
  await provider.cancelSubscription(checkout.subscriptionId);
  await syncSubscription(db, provider, checkout.subscriptionId, { now });
  assert.equal((await sessionUser(db, token, now + 1)).plan, "free");
  assert.equal((await sessionUser(db, token)).trialAvailable, true, "trial not consumed");
});

test("sync rejects foreign or tampered references", async () => {
  const { db, user, provider } = await setup();
  provider.remote.set("x1", { id: "x1", status: "authorized", externalReference: "otro-usuario:pro:monthly", nextPaymentAt: null });
  assert.equal(await syncSubscription(db, provider, "x1"), null, "unknown user");
  provider.remote.set("x2", { id: "x2", status: "authorized", externalReference: `${user.id}:pro:monthly`, nextPaymentAt: null });
  assert.equal(await syncSubscription(db, provider, "x2", { expectedUserId: "someone-else" }), null, "return page for another user");
  provider.remote.set("x3", { id: "x3", status: "authorized", externalReference: `${user.id}:free:monthly`, nextPaymentAt: null });
  assert.equal(await syncSubscription(db, provider, "x3"), null, "free is never a paid plan");
  assert.equal(decodeReference(`${user.id}:pro:monthly:extra`), null);
  assert.equal(encodeReference("u", "pro", "annual"), "u:pro:annual");
  assert.equal((await db.select().from(subscriptions).all()).length, 0);
});

test("entitlement picks the best active plan", () => {
  const now = 1_000;
  assert.equal(planGrantedBy({ plan: "pro", status: "paused", accessUntil: null }, now), "free");
  assert.equal(planGrantedBy({ plan: "hacker", status: "authorized", accessUntil: null }, now), "free");
  assert.equal(
    effectivePlan([{ plan: "student", status: "authorized", accessUntil: null }, { plan: "pro", status: "cancelled", accessUntil: 2_000 }], now),
    "pro",
  );
});

test("email tokens are single-use, purpose-bound and expire", async () => {
  const { db, user } = await setup();
  const now = 10_000;
  const token = await issueEmailToken(db, user.id, "reset", now);
  assert.equal(await consumeEmailToken(db, token, "verify", now), null, "wrong purpose");
  assert.equal(await consumeEmailToken(db, token, "reset", now + 61 * 60 * 1000), null, "expired");
  const fresh = await issueEmailToken(db, user.id, "reset", now);
  assert.equal(await consumeEmailToken(db, token, "reset", now), null, "superseded by a newer link");
  assert.equal(await consumeEmailToken(db, fresh, "reset", now), user.id);
  assert.equal(await consumeEmailToken(db, fresh, "reset", now), null, "single use");
});

test("webhook signatures match an independent HMAC implementation", async () => {
  const secret = "s3cr3t";
  const ts = "1760000000";
  const sign = (id: string) => createHmac("sha256", secret).update(`id:${id};request-id:req-1;ts:${ts};`).digest("hex");
  const now = Number(ts) * 1000;
  const base = { requestId: "req-1", secret, now };
  assert.equal(await verifyWebhookSignature({ ...base, dataId: "abc123", signature: `ts=${ts},v1=${sign("abc123")}` }), true);
  assert.equal(await verifyWebhookSignature({ ...base, dataId: "ABC123", signature: `ts=${ts},v1=${sign("abc123")}` }), true, "lowercased id variant");
  assert.equal(await verifyWebhookSignature({ ...base, dataId: "abc124", signature: `ts=${ts},v1=${sign("abc123")}` }), false, "tampered id");
  assert.equal(await verifyWebhookSignature({ ...base, dataId: "abc123", signature: `ts=${ts},v1=${sign("abc123")}`, now: now + 3_600_000 }), false, "replay outside tolerance");
  assert.equal(await verifyWebhookSignature({ ...base, dataId: "abc123", signature: null }), false);
  assert.equal(await verifyWebhookSignature({ ...base, dataId: "abc123", signature: "garbage" }), false);
});
