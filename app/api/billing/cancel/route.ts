import { BillingError, cancelActiveSubscription, getBillingProvider } from "../../../lib/server/billing/service";
import { assertSameOrigin, handle, json, requireUser } from "../../../lib/server/http";

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const { db, user } = await requireUser(request);
  const provider = getBillingProvider();
  if (!provider) throw new BillingError("not_configured", "Los pagos no están disponibles en este momento.");
  const subscription = await cancelActiveSubscription(db, provider, user.id);
  return json({ status: subscription.status, accessUntil: subscription.accessUntil });
});
