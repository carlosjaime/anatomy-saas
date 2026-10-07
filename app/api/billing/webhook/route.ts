import { getDb } from "../../../../db";
import { billingConfig, isProduction } from "../../../lib/server/config";
import { getBillingProvider, syncSubscription } from "../../../lib/server/billing/service";
import { verifyWebhookSignature } from "../../../lib/server/billing/webhook-signature";
import { json } from "../../../lib/server/http";

/**
 * Notificaciones de Mercado Pago. Es una llamada servidor-a-servidor, así que
 * no aplica la verificación de Origin: la autenticidad la da la firma HMAC.
 * El cuerpo solo indica *qué* cambió; el estado real siempre se vuelve a
 * consultar a la API, lo que hace el procesamiento idempotente.
 */
export async function POST(request: Request): Promise<Response> {
  const config = billingConfig();
  if (config.provider !== "mercadopago") return json({ error: "Pagos no configurados." }, { status: 404 });

  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? body.topic ?? "";

  if (config.webhookSecret) {
    const valid = await verifyWebhookSignature({
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId,
      secret: config.webhookSecret,
    });
    if (!valid) return json({ error: "Firma no válida." }, { status: 401 });
  } else if (isProduction()) {
    console.error("[billing] MERCADOPAGO_WEBHOOK_SECRET no configurado: webhook rechazado.");
    return json({ error: "Webhook no configurado." }, { status: 503 });
  }

  if (!dataId) return json({ ignored: true });
  const provider = getBillingProvider();
  if (!provider) return json({ error: "Pagos no configurados." }, { status: 404 });

  try {
    const db = await getDb();
    let subscriptionId: string | null = null;
    if (type === "subscription_preapproval" || type === "preapproval") subscriptionId = dataId;
    else if (type === "subscription_authorized_payment") subscriptionId = await provider.subscriptionIdForPayment(dataId);
    if (!subscriptionId) return json({ ignored: true });
    await syncSubscription(db, provider, subscriptionId);
    return json({ ok: true });
  } catch (error) {
    // 5xx hace que Mercado Pago reintente la notificación más tarde.
    console.error("[billing] error procesando webhook", type, dataId, error);
    return json({ error: "Error temporal." }, { status: 500 });
  }
}
