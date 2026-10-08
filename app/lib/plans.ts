/**
 * Catálogo de planes y reglas de acceso, en pesos mexicanos (MXN).
 *
 * Es un módulo puro —sin React ni APIs del navegador— para que las reglas de
 * precios y de acceso se puedan probar de forma aislada y compartir entre
 * cliente y servidor. Los precios son mensuales, con IVA incluido.
 */

export type PlanId = "free" | "student" | "pro" | "institution";
export type BillingCycle = "monthly" | "annual";

/** Capacidades que un plan puede desbloquear. */
export type Feature =
  /** Contenido clínico completo de todos los órganos (incluidos los "pro"). */
  | "allOrgans"
  /** Artículos de enciclopedia de todos los órganos. */
  | "fullEncyclopedia"
  /** Sección "Correlación clínica" de los artículos. */
  | "clinicalCorrelation"
  /** Tarjetas de estudio de todos los órganos. */
  | "allFlashcards";

export type Plan = {
  id: PlanId;
  /** Nombre canónico (es-MX) para conceptos de cobro; la UI usa el diccionario. */
  name: string;
  /** Precio mensual en MXN con IVA incluido. */
  monthlyPrice: number;
  features: readonly Feature[];
  highlight?: boolean;
  seats: number;
};

/** Descuento aplicado al pagar 12 meses por adelantado. */
export const ANNUAL_DISCOUNT = 0.2;

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Gratis",
    monthlyPrice: 0,
    features: [],
    seats: 1,
  },
  {
    id: "student",
    name: "Estudiante",
    monthlyPrice: 129,
    features: ["allOrgans", "fullEncyclopedia", "allFlashcards"],
    seats: 1,
  },
  {
    id: "pro",
    name: "Profesional",
    monthlyPrice: 249,
    features: ["allOrgans", "fullEncyclopedia", "allFlashcards", "clinicalCorrelation"],
    highlight: true,
    seats: 1,
  },
  {
    id: "institution",
    name: "Institucional",
    monthlyPrice: 1999,
    features: ["allOrgans", "fullEncyclopedia", "allFlashcards", "clinicalCorrelation"],
    seats: 25,
  },
];

export const planById = Object.fromEntries(PLANS.map((plan) => [plan.id, plan])) as Record<PlanId, Plan>;

export const DEFAULT_PLAN: PlanId = "free";

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && Object.hasOwn(planById, value);
}

/**
 * Valida un valor persistido (p. ej. de localStorage). Cualquier cosa que no
 * sea un plan conocido cae al plan gratuito, en lugar de confiar en el dato.
 */
export function parsePlan(value: unknown): PlanId {
  return isPlanId(value) ? value : DEFAULT_PLAN;
}

export function hasFeature(plan: PlanId, feature: Feature): boolean {
  return planById[plan].features.includes(feature);
}

/** Precio equivalente por mes para el ciclo dado, redondeado a pesos. */
export function monthlyEquivalent(plan: PlanId, cycle: BillingCycle): number {
  const base = planById[plan].monthlyPrice;
  return cycle === "annual" ? Math.round(base * (1 - ANNUAL_DISCOUNT)) : base;
}

/** Monto que se cobra en cada periodo de facturación. */
export function billedAmount(plan: PlanId, cycle: BillingCycle): number {
  const perMonth = monthlyEquivalent(plan, cycle);
  return cycle === "annual" ? perMonth * 12 : perMonth;
}

/** Ahorro anual frente a pagar 12 meses sueltos. */
export function annualSavings(plan: PlanId): number {
  return planById[plan].monthlyPrice * 12 - billedAmount(plan, "annual");
}

const mxnFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "$1,999" — el código de moneda se muestra aparte como etiqueta "MXN". */
export function formatMXN(amount: number): string {
  return mxnFormatter.format(Math.round(amount));
}
