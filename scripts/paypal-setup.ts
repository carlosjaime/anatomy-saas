/**
 * Aprovisiona (o verifica) el producto y los planes de PayPal a partir del
 * catálogo de `app/lib/plans.ts`, la única fuente de verdad de los precios.
 *
 *   npm run paypal:setup             # crea producto + 6 planes, imprime PAYPAL_PLAN_IDS
 *   npm run paypal:setup -- --verify # comprueba que PAYPAL_PLAN_IDS coincida con el catálogo
 *
 * Requiere PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_ENVIRONMENT
 * (sandbox por defecto). Es idempotente: reutiliza las mismas claves
 * `PayPal-Request-Id`, así que repetirlo no duplica planes.
 */
import { billedAmount, PAID_PLAN_IDS, planById, type BillingCycle, type PaidPlanId } from "../app/lib/plans.ts";
import { PayPalClient, PLAN_KEYS, type PayPalEnvironment, type PlanKey } from "../app/lib/server/billing/paypal.ts";
import { parsePlanIds } from "../app/lib/server/config.ts";
import { fromCents } from "../app/lib/server/billing/provider.ts";

const PRODUCT_ID = "ATLAS-ANATOMICO";
const IVA_PERCENT = "16";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Falta la variable ${name}.`);
    process.exit(1);
  }
  return value;
}

type PlanPayload = {
  id?: string;
  status?: string;
  billing_cycles?: { tenure_type?: string; frequency?: { interval_unit?: string; interval_count?: number }; pricing_scheme?: { fixed_price?: { value?: string; currency_code?: string } } }[];
  taxes?: { percentage?: string; inclusive?: boolean };
};

function planBody(plan: PaidPlanId, cycle: BillingCycle) {
  return {
    product_id: PRODUCT_ID,
    name: `Atlas Anatómico ${planById[plan].name} (${cycle === "annual" ? "anual" : "mensual"})`,
    description: `Suscripción ${cycle === "annual" ? "anual" : "mensual"} al plan ${planById[plan].name}. Precio en MXN con IVA incluido.`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: { interval_unit: cycle === "annual" ? "YEAR" : "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: fromCents(billedAmount(plan, cycle) * 100), currency_code: "MXN" } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CANCEL",
      // Tras dos cobros fallidos consecutivos PayPal suspende la suscripción.
      payment_failure_threshold: 2,
    },
    taxes: { percentage: IVA_PERCENT, inclusive: true },
  };
}

function mismatches(key: PlanKey, payload: PlanPayload): string[] {
  const [plan, cycle] = key.split(":") as [PaidPlanId, BillingCycle];
  const regular = payload.billing_cycles?.find((item) => item.tenure_type === "REGULAR");
  const price = regular?.pricing_scheme?.fixed_price;
  const problems: string[] = [];
  if (payload.status !== "ACTIVE") problems.push(`estado ${payload.status}`);
  if (price?.currency_code !== "MXN") problems.push(`moneda ${price?.currency_code}`);
  if (price?.value !== fromCents(billedAmount(plan, cycle) * 100)) problems.push(`precio ${price?.value} ≠ ${fromCents(billedAmount(plan, cycle) * 100)}`);
  if (regular?.frequency?.interval_unit !== (cycle === "annual" ? "YEAR" : "MONTH") || regular.frequency.interval_count !== 1) problems.push("periodicidad");
  if ((payload.billing_cycles ?? []).some((item) => item.tenure_type === "TRIAL")) problems.push("tiene ciclo de prueba (la prueba se controla con start_time)");
  return problems;
}

async function main() {
  const environment = (process.env.PAYPAL_ENVIRONMENT?.trim() || "sandbox") as PayPalEnvironment;
  if (environment !== "sandbox" && environment !== "live") throw new Error("PAYPAL_ENVIRONMENT debe ser sandbox o live.");
  const client = new PayPalClient({ clientId: env("PAYPAL_CLIENT_ID"), clientSecret: env("PAYPAL_CLIENT_SECRET"), environment });
  console.error(`PayPal ${environment} (${client.baseUrl})`);

  if (process.argv.includes("--verify")) {
    const plans = parsePlanIds(process.env.PAYPAL_PLAN_IDS);
    if (!plans) throw new Error("PAYPAL_PLAN_IDS falta o no cubre los 6 planes.");
    let failed = false;
    for (const key of PLAN_KEYS) {
      const payload = await client.request<PlanPayload>(`/v1/billing/plans/${plans[key]}`);
      const problems = mismatches(key, payload);
      console.error(`${problems.length ? "✗" : "✓"} ${key} ${plans[key]}${problems.length ? ` — ${problems.join(", ")}` : ""}`);
      failed ||= problems.length > 0;
    }
    process.exit(failed ? 2 : 0);
  }

  await client.request("/v1/catalogs/products", {
    method: "POST",
    requestId: `atlas-product-${PRODUCT_ID}`,
    body: { id: PRODUCT_ID, name: "Atlas Anatómico", description: "Atlas de anatomía humana en 3D para la formación médica.", type: "SERVICE" },
  }).catch((error: Error & { status?: number }) => {
    // 422 DUPLICATE_RESOURCE_IDENTIFIER: el producto ya existe.
    if (error.status !== 422) throw error;
  });

  const result: Partial<Record<PlanKey, string>> = {};
  for (const plan of PAID_PLAN_IDS) {
    for (const cycle of ["monthly", "annual"] as const) {
      const key: PlanKey = `${plan}:${cycle}`;
      const created = await client.request<PlanPayload>("/v1/billing/plans", {
        method: "POST",
        requestId: `atlas-plan-${plan}-${cycle}-${billedAmount(plan, cycle)}`,
        body: planBody(plan, cycle),
      });
      if (!created.id) throw new Error(`PayPal no devolvió id para ${key}`);
      result[key] = created.id;
      console.error(`✓ ${key} → ${created.id} (${fromCents(billedAmount(plan, cycle) * 100)} MXN)`);
    }
  }
  console.log(`PAYPAL_PLAN_IDS='${JSON.stringify(result)}'`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
