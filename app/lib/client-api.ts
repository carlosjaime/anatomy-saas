import type { OrganId } from "./anatomy-data";

/**
 * Mensajes de respaldo cuando la API no devuelve uno (red caída, respuesta no
 * JSON). Se eligen por el `lang` del documento, que el cambio de idioma
 * actualiza al instante, para no cargar el diccionario completo aquí.
 */
const FALLBACK = {
  es: { generic: "No se pudo completar la solicitud.", offline: "Sin conexión. Revisa tu red e intenta de nuevo." },
  en: { generic: "The request couldn't be completed.", offline: "You're offline. Check your connection and try again." },
} as const;

function fallback(): (typeof FALLBACK)[keyof typeof FALLBACK] {
  return typeof document !== "undefined" && document.documentElement.lang.startsWith("en") ? FALLBACK.en : FALLBACK.es;
}

/** Respuesta normalizada de la API: nunca lanza por errores HTTP. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fields?: Record<string, string> };

export async function postJson<T>(url: string, body: unknown, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      ...init,
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (response.ok) return { ok: true, data: payload as T };
    return {
      ok: false,
      status: response.status,
      error: typeof payload.error === "string" ? payload.error : fallback().generic,
      fields: (payload.fields as Record<string, string> | undefined) ?? undefined,
    };
  } catch {
    return { ok: false, status: 0, error: fallback().offline };
  }
}

export type StudyEvent =
  | { organId: OrganId; kind: "view" }
  | { organId: OrganId; kind: "tour" }
  | { organId: OrganId; kind: "quiz"; correct: boolean };

/**
 * Registro de progreso en segundo plano. `keepalive` permite que el evento
 * llegue aunque el usuario navegue de inmediato a otra página.
 */
export function trackStudy(event: StudyEvent): void {
  void postJson("/api/progress", event, { keepalive: true });
}

export async function logout(): Promise<void> {
  await postJson("/api/auth/logout", {});
}
