import { HttpError, handle, json, requireUser } from "../../../../lib/server/http";
import { reconcileSubscription } from "../../../../lib/server/billing/service";
import { assertBillingRate, isSubscriptionId, requireProvider } from "../../../../lib/server/billing/routes";

type Context = { params: Promise<{ id: string }> };

/** Reconcilia una suscripción propia contra el procesador y devuelve su estado. */
export const GET = handle<Context>(async (request, m, { params }) => {
  const { id } = await params;
  if (!isSubscriptionId(id)) throw new HttpError(404, m.errors.noSubscription);
  const { db, user } = await requireUser(request, m);
  const provider = requireProvider();
  await assertBillingRate(db, user.id);
  const subscription = await reconcileSubscription(db, provider, id, { expectedUserId: user.id });
  if (!subscription) throw new HttpError(404, m.errors.noSubscription);
  return json({ subscription });
});
