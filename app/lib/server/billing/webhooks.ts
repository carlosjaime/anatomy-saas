import { eq, sql } from "drizzle-orm";
import type { Database } from "../../../../db";
import { billingTransactions, webhookEvents, type WebhookEventStatus } from "../../../../db/schema";
import { toCents, type BillingProvider, type RemoteTransaction, type RemoteTransactionKind } from "./provider";
import { recordTransaction, syncSubscription } from "./service";

/**
 * Procesamiento de eventos de webhook de PayPal ya verificados.
 *
 * - **Idempotencia:** cada evento se registra por su id; uno ya procesado se
 *   reconoce como duplicado sin repetir efectos.
 * - **Orden:** los eventos de suscripción no se aplican tal cual; disparan una
 *   consulta del estado actual a la API, así que llegar fuera de orden no
 *   puede revertir un estado más reciente.
 * - **Carreras:** dos entregas simultáneas del mismo evento convergen porque
 *   la sincronización y el registro de transacciones son upserts idempotentes.
 */

export type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  create_time?: string;
  resource_type?: string;
  resource?: Record<string, unknown>;
};

export const SUBSCRIPTION_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
]);

const SALE_EVENTS: Record<string, RemoteTransactionKind> = {
  "PAYMENT.SALE.COMPLETED": "payment",
  "PAYMENT.SALE.REFUNDED": "refund",
  "PAYMENT.SALE.REVERSED": "reversal",
};

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Resuelve el id de suscripción y los datos de la transacción de un evento `PAYMENT.SALE.*`. */
async function saleTransaction(db: Database, kind: RemoteTransactionKind, resource: Record<string, unknown>, fallbackTime: string | undefined): Promise<RemoteTransaction | null> {
  const id = text(resource.id);
  const amount = resource.amount as { total?: string; currency?: string } | undefined;
  if (!id || !amount?.total || !amount.currency) return null;
  // Reembolsos y reversos apuntan a la venta original (`sale_id`); la
  // suscripción se toma de la venta si el recurso no la trae.
  const relatedId = kind === "payment" ? null : text(resource.sale_id) ?? text(resource.parent_payment);
  let subscriptionId = text(resource.billing_agreement_id);
  if (!subscriptionId && relatedId) {
    const sale = await db
      .select({ subscriptionId: billingTransactions.subscriptionId })
      .from(billingTransactions)
      .where(eq(billingTransactions.id, relatedId))
      .get();
    subscriptionId = sale?.subscriptionId ?? null;
  }
  if (!subscriptionId) return null;
  const occurredAt = Date.parse(text(resource.update_time) ?? text(resource.create_time) ?? fallbackTime ?? "");
  return {
    id,
    subscriptionId,
    kind,
    status: (text(resource.state) ?? text(resource.status) ?? "completed").toLowerCase(),
    amountCents: Math.abs(toCents(amount.total)),
    currency: amount.currency,
    relatedId,
    occurredAt: Number.isNaN(occurredAt) ? Date.now() : occurredAt,
  };
}

async function markEvent(db: Database, id: string, status: WebhookEventStatus, now: number, error: string | null = null) {
  await db.update(webhookEvents).set({ status, processedAt: now, error }).where(eq(webhookEvents.id, id));
}

/**
 * Procesa un evento **ya verificado**. Lanza si el procesamiento falla, para
 * que la ruta responda 5xx y PayPal reintente la entrega.
 */
export async function processPayPalEvent(db: Database, provider: BillingProvider, event: PayPalWebhookEvent, now = Date.now()): Promise<WebhookOutcome> {
  const id = text(event.id);
  const type = text(event.event_type);
  if (!id || !type) return "ignored";
  const resource = (event.resource && typeof event.resource === "object" ? event.resource : {}) as Record<string, unknown>;
  const resourceId = text(resource.id);

  const inserted = await db
    .insert(webhookEvents)
    .values({ id, provider: provider.name, eventType: type, resourceId, status: "received", attempts: 1, error: null, receivedAt: now, processedAt: null })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) {
    const existing = await db.select().from(webhookEvents).where(eq(webhookEvents.id, id)).get();
    if (existing && (existing.status === "processed" || existing.status === "ignored")) return "duplicate";
    await db
      .update(webhookEvents)
      .set({ attempts: sql`${webhookEvents.attempts} + 1` })
      .where(eq(webhookEvents.id, id));
  }

  try {
    if (SUBSCRIPTION_EVENTS.has(type)) {
      if (!resourceId) {
        await markEvent(db, id, "ignored", now, "evento sin id de suscripción");
        return "ignored";
      }
      const synced = await syncSubscription(db, provider, resourceId, { now });
      await markEvent(db, id, synced ? "processed" : "ignored", now, synced ? null : "suscripción ajena a esta app");
      return synced ? "processed" : "ignored";
    }

    const kind = SALE_EVENTS[type];
    if (kind) {
      const transaction = await saleTransaction(db, kind, resource, event.create_time);
      if (!transaction) {
        await markEvent(db, id, "ignored", now, "venta sin suscripción asociada");
        return "ignored";
      }
      // El cobro puede llegar antes que la activación: se sincroniza primero
      // para que exista la suscripción local a la que pertenece.
      const synced = await syncSubscription(db, provider, transaction.subscriptionId, { now });
      const recorded = synced ? await recordTransaction(db, provider, transaction, now) : null;
      if (kind === "reversal" && recorded) {
        console.warn("[billing] reverso (contracargo) registrado; requiere revisión manual", transaction.id, transaction.subscriptionId);
      }
      await markEvent(db, id, recorded ? "processed" : "ignored", now, recorded ? null : "transacción ajena a esta app");
      return recorded ? "processed" : "ignored";
    }

    await markEvent(db, id, "ignored", now, "tipo de evento no manejado");
    return "ignored";
  } catch (error) {
    await markEvent(db, id, "failed", now, String((error as Error)?.message ?? error).slice(0, 500));
    throw error;
  }
}
