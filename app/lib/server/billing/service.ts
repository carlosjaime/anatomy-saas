import { and, desc, eq, ne } from "drizzle-orm";
import type { Database } from "../../../../db";
import { billingTransactions, subscriptions, users, type BillingTransactionRow, type SubscriptionRow } from "../../../../db/schema";
import { billedAmount, CURRENCY, isBillingCycle, isPaidPlanId, isSelfServePlanId, monthlyEquivalent, planById, SELF_SERVE_PLAN_IDS, type BillingCycle, type PaidPlanId } from "../../plans";
import { billingConfig } from "../config";
import { DemoBillingProvider } from "./demo";
import { TRIAL_DAYS, planGrantedBy } from "./entitlement";
import { PayPalClient, PayPalProvider } from "./paypal";
import type { BillingProvider, RemoteSubscription, RemoteTransaction } from "./provider";

/**
 * Reglas de suscripción. El procesador de pagos es la fuente de verdad: este
 * módulo solo traduce su estado a filas locales (`syncSubscription`) y nunca
 * otorga un plan sin confirmación del procesador. Ninguna regla de aquí
 * depende de PayPal: solo de la interfaz `BillingProvider`.
 */

export type BillingErrorCode =
  | "not_configured"
  | "email_unverified"
  | "invalid_plan"
  | "invalid_cycle"
  | "already_subscribed"
  | "no_subscription"
  | "invalid_transition"
  | "rate_limited";

/** Error de negocio identificado por código; la capa HTTP elige el texto según el idioma. */
export class BillingError extends Error {
  constructor(readonly code: BillingErrorCode) {
    super(`billing:${code}`);
    this.name = "BillingError";
  }
}

const DAY_MS = 86_400_000;

export function getBillingProvider(): BillingProvider | null {
  const config = billingConfig();
  if (config.provider === "paypal") {
    const client = new PayPalClient({ clientId: config.clientId, clientSecret: config.clientSecret, environment: config.environment });
    return new PayPalProvider(client, config.plans);
  }
  if (config.provider === "demo") return new DemoBillingProvider();
  if (config.reason) console.error("[billing] pagos desactivados:", config.reason);
  return null;
}

/** `usuario:plan:ciclo` — permite reconstruir y validar el origen de cada suscripción. */
export function encodeReference(userId: string, plan: PaidPlanId, cycle: BillingCycle): string {
  return `${userId}:${plan}:${cycle}`;
}

export function decodeReference(reference: string): { userId: string; plan: PaidPlanId; cycle: BillingCycle } | null {
  const [userId, plan, cycle, extra] = reference.split(":");
  if (!userId || extra !== undefined || !isPaidPlanId(plan) || !isBillingCycle(cycle)) return null;
  return { userId, plan, cycle };
}

type CheckoutUser = { id: string; email: string; emailVerified: boolean; trialAvailable: boolean };

export type CheckoutUrls = { returnUrl: string; cancelUrl: string; locale: string };

export type CheckoutResult = { checkoutUrl: string; subscriptionId: string; trialDays: number };

function conceptFor(plan: PaidPlanId, cycle: BillingCycle) {
  return `Atlas Anatómico — Plan ${planById[plan].name} (${cycle === "annual" ? "anual" : "mensual"})`;
}

export async function startCheckout(
  db: Database,
  provider: BillingProvider,
  user: CheckoutUser,
  plan: unknown,
  cycle: unknown,
  urls: CheckoutUrls,
  now = Date.now(),
): Promise<CheckoutResult> {
  if (!isSelfServePlanId(plan)) throw new BillingError("invalid_plan");
  if (!isBillingCycle(cycle)) throw new BillingError("invalid_cycle");
  if (!user.emailVerified) throw new BillingError("email_unverified");

  const owned = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  if (owned.some((row) => row.status === "authorized" && row.plan === plan && row.cycle === cycle)) {
    throw new BillingError("already_subscribed");
  }

  const trialDays = user.trialAvailable ? TRIAL_DAYS : 0;
  const amount = billedAmount(plan, cycle);
  const created = await provider.createSubscription({
    plan,
    cycle,
    reason: conceptFor(plan, cycle),
    externalReference: encodeReference(user.id, plan, cycle),
    payerEmail: user.email,
    amount,
    startDate: trialDays > 0 ? new Date(now + trialDays * DAY_MS) : null,
    returnUrl: urls.returnUrl,
    cancelUrl: urls.cancelUrl,
    locale: urls.locale,
    requestId: crypto.randomUUID(),
  });

  await db
    .insert(subscriptions)
    .values({
      id: created.id,
      userId: user.id,
      provider: provider.name,
      plan,
      cycle,
      status: "pending",
      amount,
      trialEndsAt: trialDays > 0 ? now + trialDays * DAY_MS : null,
      nextPaymentAt: created.nextPaymentAt,
      accessUntil: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  // La demo aprueba al instante; con PayPal la activación llega por webhook o retorno.
  if (created.status !== "pending") await applyRemoteState(db, provider, created, now);
  return { checkoutUrl: created.checkoutUrl, subscriptionId: created.id, trialDays };
}

/**
 * Trae el estado del procesador y lo refleja localmente. Idempotente e
 * insensible al orden de los eventos: siempre aplica el estado *actual* del
 * procesador, nunca el contenido de una notificación.
 * Devuelve `null` si la suscripción no pertenece a esta app o al usuario
 * esperado (`expectedUserId`).
 */
export async function syncSubscription(
  db: Database,
  provider: BillingProvider,
  subscriptionId: string,
  options: { expectedUserId?: string; now?: number } = {},
): Promise<SubscriptionRow | null> {
  const remote = await provider.getSubscription(subscriptionId);
  const reference = decodeReference(remote.externalReference);
  if (!reference) return null;
  if (options.expectedUserId && reference.userId !== options.expectedUserId) return null;
  return applyRemoteState(db, provider, remote, options.now ?? Date.now());
}

async function applyRemoteState(db: Database, provider: BillingProvider, remote: RemoteSubscription, now: number): Promise<SubscriptionRow | null> {
  const reference = decodeReference(remote.externalReference);
  if (!reference) return null;
  const owner = await db.select({ id: users.id }).from(users).where(eq(users.id, reference.userId)).get();
  if (!owner) return null;

  // El plan confirmado por el procesador manda: refleja un cambio de plan
  // aprobado sobre la misma suscripción, que no altera la referencia.
  const plan = remote.confirmedPlan?.plan ?? reference.plan;
  const cycle = remote.confirmedPlan?.cycle ?? reference.cycle;
  const amount = billedAmount(plan, cycle);

  const local = await db.select().from(subscriptions).where(eq(subscriptions.id, remote.id)).get();
  // Si no la creamos nosotros (p. ej. borrada localmente), la referencia del
  // procesador basta para reconstruirla.
  const base: SubscriptionRow = local ?? {
    id: remote.id,
    userId: reference.userId,
    provider: provider.name,
    plan,
    cycle,
    status: "pending",
    amount,
    trialEndsAt: null,
    nextPaymentAt: null,
    accessUntil: null,
    createdAt: now,
    updatedAt: now,
  };
  if (base.userId !== reference.userId || base.provider !== provider.name) return null;

  const nextPaymentAt = remote.nextPaymentAt ?? base.nextPaymentAt;
  // Al cancelar una suscripción que estaba vigente se conserva el acceso hasta
  // el siguiente cobro que ya no ocurrirá. Una que nunca se autorizó (checkout
  // abandonado) no otorga nada, aunque tuviera prueba gratis programada.
  let accessUntil: number | null = null;
  if (remote.status === "cancelled") {
    accessUntil =
      base.accessUntil ?? (base.status === "authorized" ? Math.max(base.nextPaymentAt ?? 0, base.trialEndsAt ?? 0, now) : now);
  }

  const next: SubscriptionRow = { ...base, plan, cycle, amount, status: remote.status, nextPaymentAt, accessUntil, updatedAt: now };
  await db
    .insert(subscriptions)
    .values(next)
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: { plan, cycle, amount, status: next.status, nextPaymentAt: next.nextPaymentAt, accessUntil: next.accessUntil, updatedAt: now },
    });

  if (remote.status === "authorized") {
    // La prueba gratis se consume solo cuando una suscripción se confirma.
    if (base.trialEndsAt) await db.update(users).set({ trialUsed: 1 }).where(eq(users.id, reference.userId));
    await replaceOtherSubscriptions(db, provider, reference.userId, remote.id, now);
  }
  return next;
}

/** Una nueva suscripción reemplaza a la anterior (sin cobros duplicados). */
async function replaceOtherSubscriptions(db: Database, provider: BillingProvider, userId: string, keepId: string, now: number) {
  const others = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.provider, provider.name), ne(subscriptions.id, keepId)));
  for (const other of others) {
    if (other.status !== "authorized" && other.status !== "paused") continue;
    try {
      await provider.cancelSubscription(other.id, "Reemplazada por un nuevo plan");
    } catch (error) {
      // Se registra y se reintenta en la siguiente sincronización.
      console.error("[billing] no se pudo cancelar la suscripción reemplazada", other.id, error);
      continue;
    }
    await db
      .update(subscriptions)
      .set({ status: "cancelled", accessUntil: now, updatedAt: now })
      .where(eq(subscriptions.id, other.id));
  }
}

/** Suscripción del usuario que se puede administrar (activa o pausada). */
async function ownedManageable(db: Database, provider: BillingProvider, userId: string, subscriptionId?: string): Promise<SubscriptionRow> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.provider, provider.name)))
    .orderBy(desc(subscriptions.updatedAt));
  const candidate = subscriptionId ? rows.find((row) => row.id === subscriptionId) : rows.find((row) => row.status === "authorized" || row.status === "paused");
  if (!candidate) throw new BillingError("no_subscription");
  return candidate;
}

async function transition(
  db: Database,
  provider: BillingProvider,
  userId: string,
  subscriptionId: string | undefined,
  allowed: readonly SubscriptionRow["status"][],
  run: (id: string) => Promise<RemoteSubscription>,
  now: number,
): Promise<SubscriptionRow> {
  const row = await ownedManageable(db, provider, userId, subscriptionId);
  // Se reconcilia antes de actuar: el estado local puede estar atrasado.
  const fresh = (await syncSubscription(db, provider, row.id, { expectedUserId: userId, now })) ?? row;
  if (!allowed.includes(fresh.status)) throw new BillingError("invalid_transition");
  const updated = await applyRemoteState(db, provider, await run(fresh.id), now);
  if (!updated) throw new BillingError("no_subscription");
  return updated;
}

export function cancelSubscription(db: Database, provider: BillingProvider, userId: string, subscriptionId?: string, now = Date.now()) {
  return transition(db, provider, userId, subscriptionId, ["authorized", "paused"], (id) => provider.cancelSubscription(id, "Cancelada por el usuario"), now);
}

/** Compatibilidad con la ruta anterior: cancela la suscripción vigente. */
export function cancelActiveSubscription(db: Database, provider: BillingProvider, userId: string, now = Date.now()) {
  return cancelSubscription(db, provider, userId, undefined, now);
}

/** Pausa cobros y acceso; el plan vuelve a gratuito hasta reactivarla. */
export function suspendSubscription(db: Database, provider: BillingProvider, userId: string, subscriptionId: string, now = Date.now()) {
  return transition(db, provider, userId, subscriptionId, ["authorized"], (id) => provider.suspendSubscription(id, "Pausada por el usuario"), now);
}

export function activateSubscription(db: Database, provider: BillingProvider, userId: string, subscriptionId: string, now = Date.now()) {
  return transition(db, provider, userId, subscriptionId, ["paused"], (id) => provider.activateSubscription(id, "Reactivada por el usuario"), now);
}

/**
 * Cambio a un plan **más económico** sobre la misma suscripción. PayPal cobra
 * el nuevo precio desde el siguiente ciclo, tras la aprobación del cliente; el
 * plan local cambia solo cuando el procesador confirma el nuevo id de plan.
 *
 * Las mejoras de plan no pasan por aquí: se contratan como suscripción nueva
 * (cobro inmediato al nuevo precio) que cancela la anterior al activarse. Así
 * una revisión nunca da acceso superior al precio del plan anterior.
 */
export async function reviseSubscription(
  db: Database,
  provider: BillingProvider,
  userId: string,
  subscriptionId: string,
  plan: unknown,
  cycle: unknown,
  urls: CheckoutUrls,
  now = Date.now(),
): Promise<{ approvalUrl: string }> {
  if (!isSelfServePlanId(plan)) throw new BillingError("invalid_plan");
  if (!isBillingCycle(cycle)) throw new BillingError("invalid_cycle");
  const row = await ownedManageable(db, provider, userId, subscriptionId);
  const fresh = (await syncSubscription(db, provider, row.id, { expectedUserId: userId, now })) ?? row;
  if (fresh.status !== "authorized") throw new BillingError("invalid_transition");
  if (fresh.plan === plan && fresh.cycle === cycle) throw new BillingError("already_subscribed");
  if (!isPaidPlanId(fresh.plan) || !isBillingCycle(fresh.cycle) || monthlyEquivalent(plan, cycle) >= monthlyEquivalent(fresh.plan, fresh.cycle)) {
    throw new BillingError("invalid_transition");
  }
  return provider.reviseSubscription(fresh.id, { plan, cycle, returnUrl: urls.returnUrl, cancelUrl: urls.cancelUrl, locale: urls.locale });
}

// ---------------------------------------------------------------- transactions

/** Importes válidos por periodo en centavos para cualquier plan y ciclo. */
const VALID_AMOUNTS = new Set(SELF_SERVE_PLAN_IDS.flatMap((plan) => [billedAmount(plan, "monthly") * 100, billedAmount(plan, "annual") * 100]));

/**
 * Registra (o actualiza) una transacción del procesador. Idempotente por id.
 * Un cobro con moneda distinta o importe que no corresponde a un plan se
 * marca para revisión (`flagged`) y se registra en el log.
 */
export async function recordTransaction(
  db: Database,
  provider: BillingProvider,
  transaction: RemoteTransaction,
  now = Date.now(),
): Promise<BillingTransactionRow | null> {
  const subscription = await db.select().from(subscriptions).where(eq(subscriptions.id, transaction.subscriptionId)).get();
  if (!subscription || subscription.provider !== provider.name) return null;
  const amountCents = Math.abs(transaction.amountCents);
  if (!Number.isFinite(amountCents)) return null;
  const flagged =
    transaction.currency !== CURRENCY || (transaction.kind === "payment" && !VALID_AMOUNTS.has(amountCents)) ? 1 : 0;
  if (flagged) console.error("[billing] transacción con importe o moneda inesperados", transaction.id, amountCents, transaction.currency);
  const row: BillingTransactionRow = {
    id: transaction.id,
    provider: provider.name,
    subscriptionId: subscription.id,
    userId: subscription.userId,
    kind: transaction.kind,
    status: transaction.status,
    amountCents,
    currency: transaction.currency,
    flagged,
    relatedId: transaction.relatedId,
    occurredAt: transaction.occurredAt,
    createdAt: now,
    updatedAt: now,
  };
  await db
    .insert(billingTransactions)
    .values(row)
    .onConflictDoUpdate({ target: billingTransactions.id, set: { status: row.status, flagged: row.flagged, updatedAt: now } });
  return row;
}

/** Reconciliación completa contra el procesador: estado y transacciones. */
export async function reconcileSubscription(
  db: Database,
  provider: BillingProvider,
  subscriptionId: string,
  options: { expectedUserId?: string; now?: number } = {},
): Promise<SubscriptionRow | null> {
  const now = options.now ?? Date.now();
  const synced = await syncSubscription(db, provider, subscriptionId, { ...options, now });
  if (!synced) return null;
  const transactions = await provider.listTransactions(subscriptionId, new Date(synced.createdAt - DAY_MS), new Date(now));
  for (const transaction of transactions) await recordTransaction(db, provider, transaction, now);
  return synced;
}

export async function listTransactions(db: Database, userId: string, limit = 50): Promise<BillingTransactionRow[]> {
  return db
    .select()
    .from(billingTransactions)
    .where(eq(billingTransactions.userId, userId))
    .orderBy(desc(billingTransactions.occurredAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

// ---------------------------------------------------------------- summary

export type BillingSummary = {
  current: SubscriptionRow | null;
  /** Suscripción pausada (sin acceso ni cobros). */
  paused: SubscriptionRow | null;
  /** Suscripción en espera de confirmación (checkout abandonado o en proceso). */
  pending: SubscriptionRow | null;
};

/** Suscripción que hoy otorga acceso (la más reciente), la pausada y la pendiente. */
export async function getBillingSummary(db: Database, userId: string, now = Date.now()): Promise<BillingSummary> {
  const owned = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.updatedAt));
  return {
    current: owned.find((row) => planGrantedBy(row, now) !== "free") ?? null,
    paused: owned.find((row) => row.status === "paused") ?? null,
    pending: owned.find((row) => row.status === "pending") ?? null,
  };
}
