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
  name: string;
  tagline: string;
  /** Precio mensual en MXN con IVA incluido. */
  monthlyPrice: number;
  features: readonly Feature[];
  /** Beneficios mostrados en la tarjeta de precios. */
  perks: readonly string[];
  highlight?: boolean;
  seats: number;
};

/** Descuento aplicado al pagar 12 meses por adelantado. */
export const ANNUAL_DISCOUNT = 0.2;

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Gratis",
    tagline: "Para empezar a explorar",
    monthlyPrice: 0,
    features: [],
    seats: 1,
    perks: [
      "Visor 3D interactivo de los 9 órganos",
      "Ficha clínica de 4 órganos",
      "Glosario anatómico completo",
      "Tarjetas de estudio de órganos gratuitos",
    ],
  },
  {
    id: "student",
    name: "Estudiante",
    tagline: "Para la carrera de medicina",
    monthlyPrice: 129,
    features: ["allOrgans", "fullEncyclopedia", "allFlashcards"],
    seats: 1,
    perks: [
      "Los 9 órganos sin restricciones",
      "Enciclopedia completa: anatomía, histología y embriología",
      "Todas las tarjetas de estudio y cuestionarios",
      "Comparativas y animaciones de función",
    ],
  },
  {
    id: "pro",
    name: "Profesional",
    tagline: "Para residentes y clínicos",
    monthlyPrice: 249,
    features: ["allOrgans", "fullEncyclopedia", "allFlashcards", "clinicalCorrelation"],
    highlight: true,
    seats: 1,
    perks: [
      "Todo lo del plan Estudiante",
      "Correlación clínica en cada artículo",
      "Semiología, estudios y abordaje diagnóstico",
      "Soporte prioritario",
    ],
  },
  {
    id: "institution",
    name: "Institucional",
    tagline: "Para universidades y hospitales",
    monthlyPrice: 1999,
    features: ["allOrgans", "fullEncyclopedia", "allFlashcards", "clinicalCorrelation"],
    seats: 25,
    perks: [
      "Todo lo del plan Profesional",
      "Hasta 25 licencias incluidas",
      "Facturación con CFDI 4.0",
      "Acompañamiento para docentes",
    ],
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
