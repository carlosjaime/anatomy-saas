import type {
  BillingProvider,
  CreateSubscriptionInput,
  RemoteSubscription,
  RemoteTransaction,
  RevisionInput,
} from "../../app/lib/server/billing/provider.ts";

export const URLS = { returnUrl: "https://app/cuenta?billing=return", cancelUrl: "https://app/cuenta?billing=abandoned", locale: "es-MX" };

/** Proveedor falso que imita el ciclo de vida de una suscripción de PayPal. */
export class FakeProvider implements BillingProvider {
  readonly name = "paypal" as const;
  remote = new Map<string, RemoteSubscription>();
  created: CreateSubscriptionInput[] = [];
  revisions: { id: string; input: RevisionInput }[] = [];
  transactions = new Map<string, RemoteTransaction[]>();
  private seq = 0;

  async createSubscription(input: CreateSubscriptionInput) {
    const id = `I-FAKE${String(++this.seq).padStart(6, "0")}`;
    const remote: RemoteSubscription = {
      id,
      status: "pending",
      externalReference: input.externalReference,
      nextPaymentAt: null,
      confirmedPlan: { plan: input.plan, cycle: input.cycle },
    };
    this.remote.set(id, remote);
    this.created.push(input);
    return { ...remote, checkoutUrl: `https://paypal.test/approve/${id}` };
  }
  async getSubscription(id: string) {
    const remote = this.remote.get(id);
    if (!remote) throw new Error("not found");
    return remote;
  }
  private async set(id: string, status: RemoteSubscription["status"]) {
    const remote = { ...(await this.getSubscription(id)), status };
    this.remote.set(id, remote);
    return remote;
  }
  cancelSubscription(id: string) {
    return this.set(id, "cancelled");
  }
  suspendSubscription(id: string) {
    return this.set(id, "paused");
  }
  activateSubscription(id: string) {
    return this.set(id, "authorized");
  }
  async reviseSubscription(id: string, input: RevisionInput) {
    this.revisions.push({ id, input });
    return { approvalUrl: `https://paypal.test/revise/${id}` };
  }
  async listTransactions(id: string) {
    return this.transactions.get(id) ?? [];
  }
  /** Simula que el usuario aprobó la suscripción en PayPal. */
  authorize(id: string, nextPaymentAt: number) {
    this.remote.set(id, { ...this.remote.get(id)!, status: "authorized", nextPaymentAt });
  }
}

