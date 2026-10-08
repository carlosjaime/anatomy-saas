import { appUrl } from "../../../lib/server/config";
import { BillingError, getBillingProvider, startCheckout } from "../../../lib/server/billing/service";
import { assertSameOrigin, handle, json, readJson, requireUser } from "../../../lib/server/http";
import { isPlanId, type BillingCycle } from "../../../lib/plans";

export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const body = await readJson(request, m);
  const { db, user } = await requireUser(request, m);
  const provider = getBillingProvider();
  if (!provider) throw new BillingError("not_configured");
  if (!isPlanId(body.plan)) throw new BillingError("invalid_plan");
  const cycle: BillingCycle = body.cycle === "annual" ? "annual" : "monthly";

  const result = await startCheckout(db, provider, user, body.plan, cycle, `${appUrl(request)}/cuenta?billing=return`);
  return json({ checkoutUrl: result.checkoutUrl, trialDays: result.trialDays }, { status: 201 });
});
