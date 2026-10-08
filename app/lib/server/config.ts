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
 * URL pública de la app para enlaces en correos y `back_url` de pagos.
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
    !readEnv("MERCADOPAGO_ACCESS_TOKEN") &&
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

export type BillingConfig =
  | { provider: "mercadopago"; accessToken: string; webhookSecret: string | null }
  | { provider: "demo" }
  | { provider: "none" };

/**
 * Mercado Pago si hay credenciales. Sin ellas, un proveedor de demostración
 * solo fuera de producción (nunca otorga planes de pago en producción).
 */
export function billingConfig(): BillingConfig {
  const accessToken = readEnv("MERCADOPAGO_ACCESS_TOKEN");
  if (accessToken) return { provider: "mercadopago", accessToken, webhookSecret: readEnv("MERCADOPAGO_WEBHOOK_SECRET") ?? null };
  return isProduction() && !isE2E() ? { provider: "none" } : { provider: "demo" };
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
