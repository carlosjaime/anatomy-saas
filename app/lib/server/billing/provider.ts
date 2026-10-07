import type { SubscriptionStatus } from "../../../../db/schema";

/**
 * Contrato mínimo con el procesador de pagos. El servicio de facturación solo
 * depende de esta interfaz, así que se puede probar con un proveedor falso y
 * cambiar de procesador sin tocar las reglas de negocio.
 */

export type CreateSubscriptionInput = {
  reason: string;
  externalReference: string;
  payerEmail: string;
  /** Monto por periodo en MXN. */
  amount: number;
  frequencyMonths: 1 | 12;
  /** Primer cobro diferido (prueba gratis). */
  startDate: Date | null;
  backUrl: string;
};

export type RemoteSubscription = {
  id: string;
  status: SubscriptionStatus;
  externalReference: string;
  nextPaymentAt: number | null;
};

export type CreatedSubscription = RemoteSubscription & { checkoutUrl: string };

export interface BillingProvider {
  readonly name: "mercadopago" | "demo";
  createSubscription(input: CreateSubscriptionInput): Promise<CreatedSubscription>;
  getSubscription(id: string): Promise<RemoteSubscription>;
  cancelSubscription(id: string): Promise<RemoteSubscription>;
  /** Resuelve la suscripción a la que pertenece un cobro recurrente. */
  subscriptionIdForPayment(paymentId: string): Promise<string | null>;
}

export class BillingProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "BillingProviderError";
  }
}
