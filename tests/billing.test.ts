import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@libsql/client";
import { connect, type Database } from "../db/index.ts";
import { MIGRATIONS, migrate } from "../db/migrations.ts";
import { subscriptions } from "../db/schema.ts";
import { getUserBySessionToken, markEmailVerified, registerUser } from "../app/lib/server/auth-store.ts";
import { effectivePlan, planGrantedBy } from "../app/lib/server/billing/entitlement.ts";
import { FakeProvider, URLS } from "./support/fake-billing.ts";
import {
  BillingError,
  activateSubscription,
  cancelActiveSubscription,
  decodeReference,
  encodeReference,
  getBillingSummary,
  listTransactions,
  reconcileSubscription,
  recordTransaction,
  reviseSubscription,
  startCheckout,
  suspendSubscription,
  syncSubscription,
} from "../app/lib/server/billing/service.ts";
import { consumeEmailToken, issueEmailToken } from "../app/lib/server/email-tokens.ts";
import { billedAmount } from "../app/lib/plans.ts";

const DAY = 86_400_000;

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
  assert.deepEqual(await migrate(run), [2, 3]);
  assert.deepEqual(await migrate(run), []);
  const row = (await client.execute("SELECT trial_used, email_verified_at FROM users WHERE id = 'u1'")).rows[0];
  assert.equal(Number(row.trial_used), 0, "existing users get the trial");
  assert.equal(row.email_verified_at, null);
});

test("checkout requires a verified email and a paid plan", async () => {
  const { db, token, provider } = await setup();
  const user = await sessionUser(db, token);
  await assert.rejects(startCheckout(db, provider, user, "pro", "monthly", URLS), (e: unknown) => e instanceof BillingError && e.code === "email_unverified");
  await markEmailVerified(db, user.id);
  const verified = await sessionUser(db, token);
  await assert.rejects(startCheckout(db, provider, verified, "free", "monthly", URLS), (e: unknown) => e instanceof BillingError && e.code === "invalid_plan");
});

test("trial checkout → authorization → plan active, trial consumed once", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const user = await sessionUser(db, token);
  const now = Date.UTC(2026, 9, 7);

  const checkout = await startCheckout(db, provider, user, "pro", "annual", URLS, now);
  assert.equal(checkout.trialDays, 7);
  assert.equal(provider.created[0].amount, billedAmount("pro", "annual"));
  assert.equal(provider.created[0].cycle, "annual");
  assert.equal(provider.created[0].returnUrl, URLS.returnUrl);
  assert.equal(provider.created[0].startDate?.getTime(), now + 7 * DAY, "first charge deferred by the trial");
  assert.equal(decodeReference(provider.created[0].externalReference)?.userId, user.id);

  assert.equal((await sessionUser(db, token, now)).plan, "free", "pending checkout grants nothing");
  provider.authorize(checkout.subscriptionId, now + 7 * DAY);
  await syncSubscription(db, provider, checkout.subscriptionId, { now });
  await syncSubscription(db, provider, checkout.subscriptionId, { now }); // idempotent
  const active = await sessionUser(db, token, now);
  assert.equal(active.plan, "pro");
  assert.equal(active.trialAvailable, false);

  const second = await startCheckout(db, provider, active, "student", "monthly", URLS, now);
  assert.equal(second.trialDays, 0, "no second trial");
  assert.equal(provider.created[1].startDate, null);
});

test("changing plan cancels the previous subscription once the new one is authorized", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const now = Date.now();
  const first = await startCheckout(db, provider, await sessionUser(db, token), "student", "monthly", URLS, now);
  provider.authorize(first.subscriptionId, now + 30 * DAY);
  await syncSubscription(db, provider, first.subscriptionId, { now });

  const upgrade = await startCheckout(db, provider, await sessionUser(db, token), "pro", "monthly", URLS, now);
  provider.authorize(upgrade.subscriptionId, now + 30 * DAY);
  await syncSubscription(db, provider, upgrade.subscriptionId, { now });

  assert.equal(provider.remote.get(first.subscriptionId)?.status, "cancelled");
  assert.equal((await sessionUser(db, token, now)).plan, "pro");
});

test("cancellation keeps access until the paid period ends", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const now = Date.UTC(2026, 9, 1);
  const checkout = await startCheckout(db, provider, await sessionUser(db, token), "student", "monthly", URLS, now);
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
  const checkout = await startCheckout(db, provider, await sessionUser(db, token), "pro", "monthly", URLS, now);
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

async function activePlan(plan: "student" | "pro" | "institution" = "pro", cycle: "monthly" | "annual" = "monthly", now = Date.UTC(2026, 9, 1)) {
  const ctx = await setup();
  await markEmailVerified(ctx.db, (await sessionUser(ctx.db, ctx.token)).id);
  const checkout = await startCheckout(ctx.db, ctx.provider, await sessionUser(ctx.db, ctx.token), plan, cycle, URLS, now);
  ctx.provider.authorize(checkout.subscriptionId, now + 30 * DAY);
  await syncSubscription(ctx.db, ctx.provider, checkout.subscriptionId, { now });
  return { ...ctx, id: checkout.subscriptionId, now };
}

test("checkout validates plan and cycle from untrusted input", async () => {
  const { db, token, provider } = await setup();
  await markEmailVerified(db, (await sessionUser(db, token)).id);
  const user = await sessionUser(db, token);
  await assert.rejects(startCheckout(db, provider, user, "hacker", "monthly", URLS), (e: unknown) => e instanceof BillingError && e.code === "invalid_plan");
  await assert.rejects(startCheckout(db, provider, user, "pro", "weekly", URLS), (e: unknown) => e instanceof BillingError && e.code === "invalid_cycle");
  assert.equal(provider.created.length, 0, "nothing reaches the processor");
});

test("suspend removes access and stops billing; activate restores it", async () => {
  const { db, token, provider, id, now } = await activePlan();
  const userId = (await sessionUser(db, token, now)).id;
  const paused = await suspendSubscription(db, provider, userId, id, now);
  assert.equal(paused.status, "paused");
  assert.equal((await sessionUser(db, token, now)).plan, "free");
  assert.equal((await getBillingSummary(db, userId, now)).paused?.id, id);
  await assert.rejects(suspendSubscription(db, provider, userId, id, now), (e: unknown) => e instanceof BillingError && e.code === "invalid_transition");

  const resumed = await activateSubscription(db, provider, userId, id, now);
  assert.equal(resumed.status, "authorized");
  assert.equal((await sessionUser(db, token, now)).plan, "pro");
});

test("lifecycle actions are scoped to the owner", async () => {
  const { db, provider, id, now } = await activePlan();
  const other = await registerUser(db, { name: "Luis", email: "luis@hospital.mx", password: "Anatomia2026", role: "medico", institution: null });
  assert.ok(other.ok);
  await assert.rejects(suspendSubscription(db, provider, other.user.id, id, now), (e: unknown) => e instanceof BillingError && e.code === "no_subscription");
  await assert.rejects(cancelActiveSubscription(db, provider, other.user.id, now), (e: unknown) => e instanceof BillingError && e.code === "no_subscription");
  assert.equal(provider.remote.get(id)?.status, "authorized");
});

test("the processor's plan id wins over the reference after an approved revision", async () => {
  const { db, token, provider, id, now } = await activePlan("pro", "annual");
  const userId = (await sessionUser(db, token, now)).id;
  await assert.rejects(
    reviseSubscription(db, provider, userId, id, "institution", "annual", URLS, now),
    (e: unknown) => e instanceof BillingError && e.code === "invalid_transition",
    "upgrades never go through a revision",
  );
  const { approvalUrl } = await reviseSubscription(db, provider, userId, id, "student", "annual", URLS, now);
  assert.match(approvalUrl, /revise/);
  assert.equal((await sessionUser(db, token, now)).plan, "pro", "nothing changes before approval");

  provider.remote.set(id, { ...provider.remote.get(id)!, confirmedPlan: { plan: "student", cycle: "annual" } });
  const synced = await syncSubscription(db, provider, id, { now });
  assert.equal(synced?.plan, "student");
  assert.equal(synced?.amount, billedAmount("student", "annual"));
  assert.equal((await sessionUser(db, token, now)).plan, "student");
});

test("transactions are idempotent, scoped and flagged on unexpected amounts", async () => {
  const { db, token, provider, id, now } = await activePlan("pro", "monthly");
  const userId = (await sessionUser(db, token, now)).id;
  const sale = { id: "SALE1", subscriptionId: id, kind: "payment" as const, status: "completed", amountCents: billedAmount("pro", "monthly") * 100, currency: "MXN", relatedId: null, occurredAt: now };
  await recordTransaction(db, provider, sale, now);
  await recordTransaction(db, provider, sale, now);
  const odd = await recordTransaction(db, provider, { ...sale, id: "SALE2", amountCents: 100, currency: "USD" }, now);
  assert.equal(odd?.flagged, 1);
  assert.equal(await recordTransaction(db, provider, { ...sale, id: "SALE3", subscriptionId: "I-UNKNOWN" }, now), null);
  const rows = await listTransactions(db, userId);
  assert.deepEqual(rows.map((row) => row.id).sort(), ["SALE1", "SALE2"]);
  assert.equal(rows.find((row) => row.id === "SALE1")?.flagged, 0);
});

test("reconciliation backfills the processor's transactions", async () => {
  const { db, token, provider, id, now } = await activePlan("student", "monthly");
  provider.transactions.set(id, [
    { id: "T1", subscriptionId: id, kind: "payment", status: "completed", amountCents: billedAmount("student", "monthly") * 100, currency: "MXN", relatedId: null, occurredAt: now },
  ]);
  const userId = (await sessionUser(db, token, now)).id;
  assert.equal(await reconcileSubscription(db, provider, id, { expectedUserId: "intruder", now }), null);
  assert.equal((await listTransactions(db, userId)).length, 0);
  await reconcileSubscription(db, provider, id, { expectedUserId: userId, now });
  assert.equal((await listTransactions(db, userId)).length, 1);
});
