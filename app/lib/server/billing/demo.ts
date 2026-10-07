import type { BillingProvider, CreateSubscriptionInput, CreatedSubscription, RemoteSubscription } from "./provider";

/**
 * Proveedor de demostración para desarrollo local sin credenciales. Autoriza
 * al instante y conserva el estado en memoria del proceso. `billingConfig()`
 * nunca lo habilita en producción.
 */
// En `globalThis` para compartirse entre los bundles de rutas y páginas que
// Next.js carga por separado dentro del mismo proceso.
const STORE_KEY = Symbol.for("atlas-anatomico.demo-billing");
const store: Map<string, RemoteSubscription> = ((globalThis as Record<symbol, unknown>)[STORE_KEY] ??= new Map()) as Map<
  string,
  RemoteSubscription
>;

export class DemoBillingProvider implements BillingProvider {
  readonly name = "demo" as const;

  async createSubscription(input: CreateSubscriptionInput): Promise<CreatedSubscription> {
    const id = `demo_${crypto.randomUUID()}`;
    const nextPaymentAt = (input.startDate ?? new Date()).getTime() + (input.startDate ? 0 : input.frequencyMonths * 30 * 86_400_000);
    const remote: RemoteSubscription = { id, status: "authorized", externalReference: input.externalReference, nextPaymentAt };
    store.set(id, remote);
    const url = new URL(input.backUrl);
    url.searchParams.set("preapproval_id", id);
    return { ...remote, checkoutUrl: url.toString() };
  }

  async getSubscription(id: string): Promise<RemoteSubscription> {
    const remote = store.get(id);
    if (!remote) throw new Error(`Suscripción demo desconocida: ${id}`);
    return remote;
  }

  async cancelSubscription(id: string): Promise<RemoteSubscription> {
    const remote = { ...(await this.getSubscription(id)), status: "cancelled" as const };
    store.set(id, remote);
    return remote;
  }

  async subscriptionIdForPayment(): Promise<string | null> {
    return null;
  }
}
