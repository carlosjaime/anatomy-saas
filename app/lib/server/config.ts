import { PLAN_KEYS, type PayPalEnvironment, type PayPalPlanMap } from "./billing/paypal";

/**
 * Lectura centralizada y validada de variables de entorno del servidor.
 * Ningún otro módulo lee `process.env` directamente para estos valores.
 */

function readEnv(name: string): string | undefined {
  const value = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return value && value.trim() ? value.trim() : undefined;
}

export function isProduction(): boolean {
  return readEnv("NODE_ENV") === "production";
}

/**
 * URL pública de la app para enlaces en correos y retornos del checkout.
 * `APP_URL` tiene prioridad; si falta, se usa el origen de la petición.
 */
/**
 * Modo de pruebas de extremo a extremo (`ATLAS_E2E=1`): habilita el proveedor
 * de pagos de demostración y un buzón de correo en memoria aunque el servidor
 * corra con un build de producción. Nunca se activa en un despliegue real de
 * Vercel (`VERCEL_ENV=production`) ni si hay credenciales reales configuradas.
 */
export function isE2E(): boolean {
  return (
    readEnv("ATLAS_E2E") === "1" &&
    readEnv("VERCEL_ENV") !== "production" &&
    !readEnv("PAYPAL_CLIENT_ID") &&
    !readEnv("RESEND_API_KEY")
  );
}

export function appUrl(request?: Request): string {
  const configured = readEnv("APP_URL");
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      throw new Error("APP_URL no es una URL válida.");
    }
  }
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

export type PayPalConfig = {
  provider: "paypal";
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
  webhookId: string | null;
  plans: PayPalPlanMap;
};

export type BillingConfig = PayPalConfig | { provider: "demo" } | { provider: "none"; reason: string };

/**
 * `PAYPAL_PLAN_IDS`: JSON `{"student:monthly":"P-…", …}` generado por
 * `npm run paypal:setup`. Solo se aceptan claves conocidas e ids `P-…`.
 */
export function parsePlanIds(raw: string | undefined): PayPalPlanMap | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const plans: PayPalPlanMap = {};
  for (const [key, id] of Object.entries(value)) {
    if (!(PLAN_KEYS as readonly string[]).includes(key) || typeof id !== "string" || !/^P-[A-Z0-9]{8,}$/.test(id)) return null;
    plans[key as keyof PayPalPlanMap] = id;
  }
  return PLAN_KEYS.every((key) => plans[key]) ? plans : null;
}

/**
 * PayPal si hay credenciales completas. Sin ellas, un proveedor de demostración
 * solo fuera de producción (nunca otorga planes de pago en producción).
 * `PAYPAL_ENVIRONMENT` debe ser explícitamente `live` para cobrar de verdad.
 */
export function billingConfig(): BillingConfig {
  const clientId = readEnv("PAYPAL_CLIENT_ID");
  const clientSecret = readEnv("PAYPAL_CLIENT_SECRET");
  if (clientId || clientSecret) {
    if (!clientId || !clientSecret) return { provider: "none", reason: "PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET deben definirse juntos." };
    const environmentValue = readEnv("PAYPAL_ENVIRONMENT") ?? "sandbox";
    if (environmentValue !== "sandbox" && environmentValue !== "live") {
      return { provider: "none", reason: "PAYPAL_ENVIRONMENT debe ser sandbox o live." };
    }
    const plans = parsePlanIds(readEnv("PAYPAL_PLAN_IDS"));
    if (!plans) return { provider: "none", reason: "PAYPAL_PLAN_IDS falta o no es válido; ejecuta npm run paypal:setup." };
    return { provider: "paypal", clientId, clientSecret, environment: environmentValue, webhookId: readEnv("PAYPAL_WEBHOOK_ID") ?? null, plans };
  }
  return isProduction() && !isE2E() ? { provider: "none", reason: "PayPal no está configurado." } : { provider: "demo" };
}

export type MailConfig =
  | { provider: "resend"; apiKey: string; from: string }
  | { provider: "console" }
  | { provider: "memory" }
  | { provider: "none" };

export function mailConfig(): MailConfig {
  const apiKey = readEnv("RESEND_API_KEY");
  if (apiKey) return { provider: "resend", apiKey, from: readEnv("EMAIL_FROM") ?? "Atlas Anatómico <no-reply@atlas-anatomico.mx>" };
  if (isE2E()) return { provider: "memory" };
  return isProduction() ? { provider: "none" } : { provider: "console" };
}
