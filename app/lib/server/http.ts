import { DatabaseUnavailableError, getDb, type Database } from "../../../db";
import { messagesFor } from "../../i18n/server";
import type { Messages } from "../../i18n/messages/es-MX";
import { getUserBySessionToken, type SessionUser } from "./auth-store";
import { BillingError, type BillingErrorCode } from "./billing/service";
import { BillingProviderError } from "./billing/provider";
import { EmailUnavailableError } from "./mailer";

/**
 * Utilidades para rutas API: sesión por cookie, defensa CSRF y respuestas
 * JSON consistentes en el idioma del usuario (cookie o `Accept-Language`).
 * Todo trabaja sobre `Request`/`Response` estándar para ser portable entre
 * Next (Vercel) y vinext (Cloudflare).
 */

export const SESSION_COOKIE = "atlas_session";
const MAX_BODY_BYTES = 16 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) continue;
    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  }
  return cookies;
}

export function readSessionToken(request: Request): string {
  return parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE) ?? "";
}

function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}

export function sessionCookie(request: Request, token: string, expiresAt: number): string {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const secure = isSecureRequest(request) ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(request: Request): string {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/**
 * CSRF: las mutaciones solo se aceptan desde el mismo origen y como JSON.
 * Un formulario de otro sitio no puede enviar `application/json` sin preflight,
 * y el encabezado Origin no se puede falsificar desde el navegador.
 */
export function assertSameOrigin(request: Request, m: Messages): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new HttpError(403, m.errors.forbidden);
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new HttpError(403, m.errors.forbidden);
  }
  // El host público puede llegar en Host o, detrás de un proxy, en
  // X-Forwarded-Host; basta con que el Origin del navegador coincida con uno.
  const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.split(",")[0].trim().toLowerCase());
  if (!hosts.includes(originHost)) throw new HttpError(403, m.errors.forbidden);
}

export async function readJson(request: Request, m: Messages): Promise<Record<string, unknown>> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    throw new HttpError(415, m.errors.jsonExpected);
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, m.errors.tooLarge);
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // cae al error de abajo
  }
  throw new HttpError(400, m.errors.invalidJson);
}

const BILLING_ERRORS: Record<BillingErrorCode, { status: number; key: keyof Messages["errors"] }> = {
  not_configured: { status: 503, key: "paymentsUnavailable" },
  email_unverified: { status: 403, key: "emailUnverified" },
  invalid_plan: { status: 422, key: "invalidPlan" },
  invalid_cycle: { status: 422, key: "invalidCycle" },
  already_subscribed: { status: 409, key: "alreadySubscribed" },
  no_subscription: { status: 422, key: "noSubscription" },
};

/**
 * Envuelve un handler: le entrega el diccionario del idioma del usuario y
 * traduce los errores conocidos a respuestas JSON en ese idioma.
 */
export function handle(handler: (request: Request, m: Messages) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const m = messagesFor(request);
    try {
      return await handler(request, m);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message, fields: error.fields }, { status: error.status });
      }
      if (error instanceof BillingError) {
        const { status, key } = BILLING_ERRORS[error.code];
        return json({ error: m.errors[key], code: error.code }, { status });
      }
      if (error instanceof BillingProviderError) {
        console.error("[billing]", error.message);
        return json({ error: m.errors.paymentsProvider }, { status: 502 });
      }
      if (error instanceof EmailUnavailableError) {
        return json({ error: m.errors.emailUnavailable }, { status: 503 });
      }
      if (error instanceof DatabaseUnavailableError) {
        console.error("[db]", error.message, error.cause ?? "");
        return json({ error: m.errors.database }, { status: 503 });
      }
      console.error("[api] unexpected error", error);
      return json({ error: m.errors.unexpected }, { status: 500 });
    }
  };
}

export async function requireUser(request: Request, m: Messages): Promise<{ db: Database; user: SessionUser }> {
  const token = readSessionToken(request);
  if (!token) throw new HttpError(401, m.errors.signInRequired);
  const db = await getDb();
  const user = await getUserBySessionToken(db, token);
  if (!user) throw new HttpError(401, m.errors.sessionExpired);
  return { db, user };
}
