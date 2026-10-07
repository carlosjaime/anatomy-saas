/**
 * Verificación de la firma `x-signature` de los webhooks de Mercado Pago.
 *
 * Formato: `ts=<segundos>,v1=<hmac-hex>`. El HMAC-SHA256 (con la clave
 * secreta del webhook) se calcula sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * omitiendo los pares sin valor, igual que el validador del SDK oficial.
 */

const encoder = new TextEncoder();
/** Ventana máxima aceptada entre la firma y la recepción (anti-replay). */
export const SIGNATURE_TOLERANCE_SECONDS = 15 * 60;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function buildManifest(dataId: string | null, requestId: string | null, ts: string): string {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  return `${parts.join(";")};`;
}

export function parseSignatureHeader(header: string): { ts: string | null; v1: string | null } {
  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value.toLowerCase();
  }
  return { ts, v1 };
}

export async function verifyWebhookSignature(options: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  now?: number;
}): Promise<boolean> {
  if (!options.signature) return false;
  const { ts, v1 } = parseSignatureHeader(options.signature);
  if (!ts || !v1 || !/^\d+$/.test(ts)) return false;
  const now = options.now ?? Date.now();
  if (Math.abs(now - Number(ts) * 1000) / 1000 > SIGNATURE_TOLERANCE_SECONDS) return false;
  // La documentación pide `data.id` en minúsculas si es alfanumérico; el SDK
  // lo usa tal cual. Se aceptan ambas variantes (las dos las firma MP).
  const candidates = new Set([options.dataId, options.dataId?.toLowerCase() ?? null]);
  for (const dataId of candidates) {
    const expected = await hmacHex(options.secret, buildManifest(dataId, options.requestId, ts));
    if (constantTimeEqual(expected, v1)) return true;
  }
  return false;
}
