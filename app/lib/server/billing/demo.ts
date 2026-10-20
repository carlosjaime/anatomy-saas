import { billedAmount } from "../../plans";
import type {
  BillingProvider,
  CreateSubscriptionInput,
  CreatedSubscription,
  RemoteSubscription,
  RemoteTransaction,
  RevisionInput,
} from "./provider";

/**
 * Proveedor de demostración para desarrollo local y E2E sin credenciales.
 * Aprueba al instante y conserva el estado en memoria del proceso.
 * `billingConfig()` nunca lo habilita en un despliegue de producción real.
 */
// En `globalThis` para compartirse entre los bundles de rutas y páginas que
// Next.js carga por separado dentro del mismo proceso.
const STORE_KEY = Symbol.for("atlas-anatomico.demo-billing");
const store: Map<string, RemoteSubscription> = ((globalThis as Record<symbol, unknown>)[STORE_KEY] ??= new Map()) as Map<
  string,
  RemoteSubscription
>;

const MONTH_MS = 30 * 86_400_000;

export class DemoBillingProvider implements BillingProvider {
  readonly name = "demo" as const;

  async createSubscription(input: CreateSubscriptionInput): Promise<CreatedSubscription> {
    const id = `demo_${crypto.randomUUID()}`;
    const periodMs = input.cycle === "annual" ? 12 * MONTH_MS : MONTH_MS;
    const nextPaymentAt = input.startDate ? input.startDate.getTime() : Date.now() + periodMs;
    const remote: RemoteSubscription = {
      id,
      status: "authorized",
      externalReference: input.externalReference,
      nextPaymentAt,
      confirmedPlan: { plan: input.plan, cycle: input.cycle },
      lastPayment: null,
    };
    store.set(id, remote);
    const url = new URL(input.returnUrl);
    url.searchParams.set("subscription_id", id);
    return { ...remote, checkoutUrl: url.toString() };
  }

  async getSubscription(id: string): Promise<RemoteSubscription> {
    const remote = store.get(id);
    if (!remote) throw new Error(`Suscripción demo desconocida: ${id}`);
    return remote;
  }

  private async setStatus(id: string, status: RemoteSubscription["status"]) {
    const remote = { ...(await this.getSubscription(id)), status };
    store.set(id, remote);
    return remote;
  }

  cancelSubscription(id: string) {
    return this.setStatus(id, "cancelled");
  }

  suspendSubscription(id: string) {
    return this.setStatus(id, "paused");
  }

  activateSubscription(id: string) {
    return this.setStatus(id, "authorized");
  }

  async reviseSubscription(id: string, input: RevisionInput): Promise<{ approvalUrl: string }> {
    store.set(id, { ...(await this.getSubscription(id)), confirmedPlan: { plan: input.plan, cycle: input.cycle } });
    const url = new URL(input.returnUrl);
    url.searchParams.set("subscription_id", id);
    return { approvalUrl: url.toString() };
  }

  async listTransactions(id: string): Promise<RemoteTransaction[]> {
    const remote = await this.getSubscription(id);
    if (!remote.confirmedPlan || remote.nextPaymentAt === null) return [];
    // La demo no cobra: no hay transacciones reales que reportar mientras dure la prueba.
    return remote.nextPaymentAt > Date.now()
      ? []
      : [
          {
            id: `${id}_1`,
            subscriptionId: id,
            kind: "payment",
            status: "completed",
            amountCents: billedAmount(remote.confirmedPlan.plan, remote.confirmedPlan.cycle) * 100,
            currency: "MXN",
            relatedId: null,
            occurredAt: remote.nextPaymentAt,
          },
        ];
  }
}
