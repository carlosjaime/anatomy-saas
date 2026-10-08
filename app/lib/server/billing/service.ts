import { and, desc, eq, ne } from "drizzle-orm";
import type { Database } from "../../../../db";
import { subscriptions, users, type SubscriptionRow } from "../../../../db/schema";
import { billedAmount, isPlanId, planById, type BillingCycle, type PlanId } from "../../plans";
import { billingConfig } from "../config";
import { DemoBillingProvider } from "./demo";
import { TRIAL_DAYS, planGrantedBy } from "./entitlement";
import { MercadoPagoProvider } from "./mercadopago";
import type { BillingProvider, RemoteSubscription } from "./provider";

/**
 * Reglas de suscripción. El proveedor de pagos es la fuente de verdad: este
 * módulo solo traduce su estado a filas locales (`syncSubscription`) y nunca
 * otorga un plan sin confirmación del proveedor.
 */

export type BillingErrorCode =
  | "not_configured"
  | "email_unverified"
  | "invalid_plan"
  | "invalid_cycle"
  | "already_subscribed"
  | "no_subscription";

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
  if (config.provider === "mercadopago") return new MercadoPagoProvider(config.accessToken);
  if (config.provider === "demo") return new DemoBillingProvider();
  return null;
}

/** `usuario:plan:ciclo` — permite reconstruir y validar el origen de cada suscripción. */
export function encodeReference(userId: string, plan: PlanId, cycle: BillingCycle): string {
  return `${userId}:${plan}:${cycle}`;
}

export function decodeReference(reference: string): { userId: string; plan: PlanId; cycle: BillingCycle } | null {
  const [userId, plan, cycle, extra] = reference.split(":");
  if (!userId || extra !== undefined || !isPlanId(plan) || plan === "free" || (cycle !== "monthly" && cycle !== "annual")) return null;
  return { userId, plan, cycle };
}

type CheckoutUser = { id: string; email: string; emailVerified: boolean; trialAvailable: boolean };

export type CheckoutResult = { checkoutUrl: string; subscriptionId: string; trialDays: number };

export async function startCheckout(
  db: Database,
  provider: BillingProvider,
  user: CheckoutUser,
  plan: PlanId,
  cycle: BillingCycle,
  backUrl: string,
  now = Date.now(),
): Promise<CheckoutResult> {
  if (!isPlanId(plan) || plan === "free") throw new BillingError("invalid_plan");
  if (cycle !== "monthly" && cycle !== "annual") throw new BillingError("invalid_cycle");
  if (!user.emailVerified) {
    throw new BillingError("email_unverified");
  }

  const owned = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  if (owned.some((row) => row.status === "authorized" && row.plan === plan && row.cycle === cycle)) {
    throw new BillingError("already_subscribed");
  }

  const trialDays = user.trialAvailable ? TRIAL_DAYS : 0;
  const amount = billedAmount(plan, cycle);
  const created = await provider.createSubscription({
    reason: `Atlas Anatómico — Plan ${planById[plan].name} (${cycle === "annual" ? "anual" : "mensual"})`,
    externalReference: encodeReference(user.id, plan, cycle),
    payerEmail: user.email,
    amount,
    frequencyMonths: cycle === "annual" ? 12 : 1,
    startDate: trialDays > 0 ? new Date(now + trialDays * DAY_MS) : null,
    backUrl,
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

  // El demo autoriza al instante; con Mercado Pago llega por webhook/retorno.
  if (created.status !== "pending") await applyRemoteState(db, provider, created, now);
  return { checkoutUrl: created.checkoutUrl, subscriptionId: created.id, trialDays };
}

/**
 * Trae el estado del proveedor y lo refleja localmente. Idempotente: se puede
 * llamar desde el webhook y desde la página de retorno sin efectos dobles.
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

  const local = await db.select().from(subscriptions).where(eq(subscriptions.id, remote.id)).get();
  // Si no la creamos nosotros (p. ej. borrada localmente), la referencia firmada
  // por el proveedor basta para reconstruirla con el plan y ciclo originales.
  const base: SubscriptionRow = local ?? {
    id: remote.id,
    userId: reference.userId,
    provider: provider.name,
    plan: reference.plan,
    cycle: reference.cycle,
    status: "pending",
    amount: billedAmount(reference.plan, reference.cycle),
    trialEndsAt: null,
    nextPaymentAt: null,
    accessUntil: null,
    createdAt: now,
    updatedAt: now,
  };
  if (base.userId !== reference.userId) return null;

  const nextPaymentAt = remote.nextPaymentAt ?? base.nextPaymentAt;
  // Al cancelar una suscripción que estaba vigente se conserva el acceso hasta
  // el siguiente cobro que ya no ocurrirá. Una que nunca se autorizó (checkout
  // abandonado) no otorga nada, aunque tuviera prueba gratis programada.
  let accessUntil: number | null = null;
  if (remote.status === "cancelled") {
    accessUntil =
      base.accessUntil ?? (base.status === "authorized" ? Math.max(base.nextPaymentAt ?? 0, base.trialEndsAt ?? 0, now) : now);
  }

  const next: SubscriptionRow = { ...base, status: remote.status, nextPaymentAt, accessUntil, updatedAt: now };
  await db
    .insert(subscriptions)
    .values(next)
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: { status: next.status, nextPaymentAt: next.nextPaymentAt, accessUntil: next.accessUntil, updatedAt: now },
    });

  if (remote.status === "authorized") {
    // La prueba gratis se consume solo cuando una suscripción se confirma.
    if (base.trialEndsAt) await db.update(users).set({ trialUsed: 1 }).where(eq(users.id, reference.userId));
    await replaceOtherSubscriptions(db, provider, reference.userId, remote.id, now);
  }
  return next;
}

/** Un cambio de plan reemplaza la suscripción anterior (sin cobros duplicados). */
async function replaceOtherSubscriptions(db: Database, provider: BillingProvider, userId: string, keepId: string, now: number) {
  const others = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "authorized"), ne(subscriptions.id, keepId)));
  for (const other of others) {
    try {
      if (other.provider === provider.name) await provider.cancelSubscription(other.id);
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

export async function cancelActiveSubscription(db: Database, provider: BillingProvider, userId: string, now = Date.now()): Promise<SubscriptionRow> {
  const active = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "authorized")))
    .orderBy(desc(subscriptions.updatedAt))
    .get();
  if (!active) throw new BillingError("no_subscription");
  const remote = await provider.cancelSubscription(active.id);
  const updated = await applyRemoteState(db, provider, remote, now);
  if (!updated) throw new BillingError("no_subscription");
  return updated;
}

export type BillingSummary = {
  current: SubscriptionRow | null;
  /** Suscripción en espera de confirmación (checkout abandonado o en proceso). */
  pending: SubscriptionRow | null;
};

/** Suscripción que hoy otorga acceso (la más reciente), y la pendiente si existe. */
export async function getBillingSummary(db: Database, userId: string, now = Date.now()): Promise<BillingSummary> {
  const owned = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.updatedAt));
  return {
    current: owned.find((row) => planGrantedBy(row, now) !== "free") ?? null,
    pending: owned.find((row) => row.status === "pending") ?? null,
  };
}
