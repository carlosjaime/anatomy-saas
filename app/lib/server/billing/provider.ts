import type { SubscriptionStatus } from "../../../../db/schema";
import type { BillingCycle, PaidPlanId } from "../../plans";

/**
 * Contrato mínimo con el procesador de pagos. El servicio de facturación solo
 * depende de esta interfaz, así que se puede probar con un proveedor falso y
 * cambiar de procesador sin tocar las reglas de negocio.
 */

export type ProviderName = "paypal" | "demo";

export type CreateSubscriptionInput = {
  plan: PaidPlanId;
  cycle: BillingCycle;
  /** Texto del concepto de cobro. */
  reason: string;
  /** `usuario:plan:ciclo`; el proveedor la devuelve intacta al consultar. */
  externalReference: string;
  payerEmail: string;
  /** Monto por periodo en MXN (lo fija el plan del proveedor; se usa para verificar). */
  amount: number;
  /** Primer cobro diferido (prueba gratis). */
  startDate: Date | null;
  /** Adónde vuelve el usuario tras aprobar en el procesador. */
  returnUrl: string;
  /** Adónde vuelve si abandona la aprobación. */
  cancelUrl: string;
  locale: string;
  /** Clave de idempotencia de la creación. */
  requestId: string;
};

export type RemotePayment = {
  /** Importe en centavos. */
  amountCents: number;
  currency: string;
  at: number;
};

export type RemoteSubscription = {
  id: string;
  status: SubscriptionStatus;
  externalReference: string;
  nextPaymentAt: number | null;
  /**
   * Plan y ciclo que el procesador confirma con su propio identificador de
   * plan. Tiene prioridad sobre la referencia, que no cambia al revisar el plan.
   * `null` si el procesador reporta un plan que esta app no reconoce.
   */
  confirmedPlan?: { plan: PaidPlanId; cycle: BillingCycle } | null;
  lastPayment?: RemotePayment | null;
};

export type CreatedSubscription = RemoteSubscription & { checkoutUrl: string };

export type RevisionInput = {
  plan: PaidPlanId;
  cycle: BillingCycle;
  returnUrl: string;
  cancelUrl: string;
  locale: string;
};

export type RemoteTransactionKind = "payment" | "refund" | "reversal";

export type RemoteTransaction = {
  id: string;
  subscriptionId: string;
  kind: RemoteTransactionKind;
  /** Estado normalizado en minúsculas tal como lo reporta el procesador. */
  status: string;
  amountCents: number;
  currency: string;
  /** Cobro original al que se refiere un reembolso o reverso. */
  relatedId: string | null;
  occurredAt: number;
};

export interface BillingProvider {
  readonly name: ProviderName;
  createSubscription(input: CreateSubscriptionInput): Promise<CreatedSubscription>;
  getSubscription(id: string): Promise<RemoteSubscription>;
  cancelSubscription(id: string, reason: string): Promise<RemoteSubscription>;
  suspendSubscription(id: string, reason: string): Promise<RemoteSubscription>;
  activateSubscription(id: string, reason: string): Promise<RemoteSubscription>;
  /** Cambio de plan sobre la misma suscripción; requiere aprobación del cliente. */
  reviseSubscription(id: string, input: RevisionInput): Promise<{ approvalUrl: string }>;
  listTransactions(id: string, since: Date, until: Date): Promise<RemoteTransaction[]>;
}

export class BillingProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Identificador de depuración del procesador (PayPal `debug_id`). */
    readonly debugId?: string,
  ) {
    super(message);
    this.name = "BillingProviderError";
  }
}

/** "249.00" → 24900, sin errores de coma flotante. */
export function toCents(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const text = typeof value === "number" ? value.toFixed(2) : value.trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return Number.NaN;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "0").padEnd(2, "0"));
  return match[1] ? -cents : cents;
}

/** 24900 → "249.00" */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
