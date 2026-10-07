import type { SubscriptionRow, SubscriptionStatus } from "../../../../db/schema";
import { isPlanId, type PlanId } from "../../plans";

/**
 * Reglas puras de acceso derivadas de las suscripciones. El plan de un
 * usuario nunca se guarda como un dato suelto: se calcula siempre a partir
 * del estado que confirmó el proveedor de pagos.
 */

const PLAN_RANK: Record<PlanId, number> = { free: 0, student: 1, pro: 2, institution: 3 };

/** Días de prueba gratis en la primera suscripción de cada cuenta. */
export const TRIAL_DAYS = 7;

type EntitlementInput = Pick<SubscriptionRow, "plan" | "status" | "accessUntil">;

/** Plan que otorga una suscripción en el instante `now`. */
export function planGrantedBy(subscription: EntitlementInput, now: number): PlanId {
  if (!isPlanId(subscription.plan)) return "free";
  if (subscription.status === "authorized") return subscription.plan;
  // Una cancelación respeta el periodo ya pagado (o la prueba en curso).
  if (subscription.status === "cancelled" && subscription.accessUntil !== null && now < subscription.accessUntil) {
    return subscription.plan;
  }
  return "free";
}

/** El mejor plan vigente entre todas las suscripciones del usuario. */
export function effectivePlan(subscriptionsOfUser: readonly EntitlementInput[], now: number): PlanId {
  let best: PlanId = "free";
  for (const subscription of subscriptionsOfUser) {
    const plan = planGrantedBy(subscription, now);
    if (PLAN_RANK[plan] > PLAN_RANK[best]) best = plan;
  }
  return best;
}

/** Normaliza estados del proveedor; cualquier valor desconocido se trata como pendiente. */
export function normalizeStatus(value: unknown): SubscriptionStatus {
  return value === "authorized" || value === "paused" || value === "cancelled" ? value : "pending";
}
