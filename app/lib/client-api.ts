import type { OrganId } from "./anatomy-data";

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
      error: typeof payload.error === "string" ? payload.error : "No se pudo completar la solicitud.",
      fields: (payload.fields as Record<string, string> | undefined) ?? undefined,
    };
  } catch {
    return { ok: false, status: 0, error: "Sin conexión. Revisa tu red e intenta de nuevo." };
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
