import { HttpError, assertSameOrigin, handle, json, readJson, requireUser } from "../../../../../lib/server/http";
import {
  activateSubscription,
  cancelSubscription,
  reviseSubscription,
  suspendSubscription,
} from "../../../../../lib/server/billing/service";
import { assertBillingRate, checkoutUrls, isSubscriptionId, requireProvider } from "../../../../../lib/server/billing/routes";

type Context = { params: Promise<{ id: string; action: string }> };

const ACTIONS = new Set(["cancel", "suspend", "activate", "revise"]);

/**
 * Ciclo de vida de una suscripción propia: `cancel`, `suspend`, `activate` y
 * `revise` (cambio de plan, devuelve un enlace de aprobación). La propiedad se
 * comprueba en el servicio contra el usuario en sesión.
 */
export const POST = handle<Context>(async (request, m, { params }) => {
  assertSameOrigin(request, m);
  const { id, action } = await params;
  if (!ACTIONS.has(action) || !isSubscriptionId(id)) throw new HttpError(404, m.errors.noSubscription);
  const body = await readJson(request, m);
  const { db, user } = await requireUser(request, m);
  const provider = requireProvider();
  await assertBillingRate(db, user.id);

  if (action === "revise") {
    const { approvalUrl } = await reviseSubscription(db, provider, user.id, id, body.plan, body.cycle, checkoutUrls(request));
    return json({ approvalUrl });
  }
  const run = action === "cancel" ? cancelSubscription : action === "suspend" ? suspendSubscription : activateSubscription;
  const subscription = await run(db, provider, user.id, id);
  return json({ status: subscription.status, accessUntil: subscription.accessUntil });
});
