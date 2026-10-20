import { getBillingSummary, startCheckout } from "../../../lib/server/billing/service";
import { assertBillingRate, checkoutUrls, requireProvider } from "../../../lib/server/billing/routes";
import { assertSameOrigin, handle, json, readJson, requireUser } from "../../../lib/server/http";

/** Estado de facturación del usuario en sesión. */
export const GET = handle(async (request, m) => {
  const { db, user } = await requireUser(request, m);
  const summary = await getBillingSummary(db, user.id);
  return json({ plan: user.plan, trialAvailable: user.trialAvailable, ...summary });
});

/** Crea una suscripción y devuelve el enlace de aprobación del procesador. */
export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const body = await readJson(request, m);
  const { db, user } = await requireUser(request, m);
  const provider = requireProvider();
  await assertBillingRate(db, user.id);
  const result = await startCheckout(db, provider, user, body.plan, body.cycle ?? "monthly", checkoutUrls(request));
  return json({ checkoutUrl: result.checkoutUrl, subscriptionId: result.subscriptionId, trialDays: result.trialDays }, { status: 201 });
});
