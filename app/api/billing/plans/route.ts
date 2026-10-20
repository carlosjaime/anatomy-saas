import { billedAmount, CURRENCY, monthlyEquivalent, PLANS } from "../../../lib/plans";
import { getBillingProvider } from "../../../lib/server/billing/service";
import { json } from "../../../lib/server/http";

/** Catálogo público de planes con importes por ciclo. Sin datos de usuario. */
export async function GET(): Promise<Response> {
  return json({
    currency: CURRENCY,
    taxIncluded: true,
    paymentsEnabled: Boolean(getBillingProvider()),
    plans: PLANS.map((plan) => ({
      id: plan.id,
      seats: plan.seats,
      features: plan.features,
      cycles: {
        monthly: { amount: billedAmount(plan.id, "monthly"), perMonth: monthlyEquivalent(plan.id, "monthly") },
        annual: { amount: billedAmount(plan.id, "annual"), perMonth: monthlyEquivalent(plan.id, "annual") },
      },
    })),
  });
}
