import { DatabaseUnavailableError, getDb, type Database } from "../../../db";
import { getUserBySessionToken, type SessionUser } from "./auth-store";

/**
 * Utilidades para rutas API: sesión por cookie, defensa CSRF y respuestas
 * JSON consistentes. Todo trabaja sobre `Request`/`Response` estándar para ser
 * portable entre Next (Vercel) y vinext (Cloudflare).
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
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new HttpError(403, "Solicitud no permitida.");
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new HttpError(403, "Solicitud no permitida.");
  }
  // El host público puede llegar en Host o, detrás de un proxy, en
  // X-Forwarded-Host; basta con que el Origin del navegador coincida con uno.
  const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.split(",")[0].trim().toLowerCase());
  if (!hosts.includes(originHost)) throw new HttpError(403, "Solicitud no permitida.");
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    throw new HttpError(415, "Se esperaba JSON.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Solicitud demasiado grande.");
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // cae al error de abajo
  }
  throw new HttpError(400, "JSON no válido.");
}

/** Envuelve un handler mapeando errores conocidos a respuestas JSON. */
export function handle(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message, fields: error.fields }, { status: error.status });
      }
      if (error instanceof DatabaseUnavailableError) {
        console.error("[db]", error.message, error.cause ?? "");
        return json({ error: error.message }, { status: 503 });
      }
      console.error("[api] unexpected error", error);
      return json({ error: "Ocurrió un error inesperado. Intenta de nuevo." }, { status: 500 });
    }
  };
}

export async function requireUser(request: Request): Promise<{ db: Database; user: SessionUser }> {
  const token = readSessionToken(request);
  if (!token) throw new HttpError(401, "Inicia sesión para continuar.");
  const db = await getDb();
  const user = await getUserBySessionToken(db, token);
  if (!user) throw new HttpError(401, "Tu sesión expiró. Inicia sesión de nuevo.");
  return { db, user };
}
