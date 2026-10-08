import { BillingError, cancelActiveSubscription, getBillingProvider } from "../../../lib/server/billing/service";
import { assertSameOrigin, handle, json, requireUser } from "../../../lib/server/http";

export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const { db, user } = await requireUser(request, m);
  const provider = getBillingProvider();
  if (!provider) throw new BillingError("not_configured");
  const subscription = await cancelActiveSubscription(db, provider, user.id);
  return json({ status: subscription.status, accessUntil: subscription.accessUntil });
});
