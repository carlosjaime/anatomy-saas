import { getDb } from "../../../../../db";
import { billingConfig, isProduction } from "../../../../lib/server/config";
import { PayPalClient, readWebhookHeaders, verifyPayPalWebhook } from "../../../../lib/server/billing/paypal";
import { getBillingProvider } from "../../../../lib/server/billing/service";
import { processPayPalEvent, type PayPalWebhookEvent } from "../../../../lib/server/billing/webhooks";
import { json } from "../../../../lib/server/http";

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Webhook de PayPal. Es servidor a servidor, así que no aplica la defensa de
 * Origin: la autenticidad la da la verificación de firma con PayPal. Ningún
 * estado se toma del cuerpo; el evento solo indica qué volver a consultar.
 * Un 5xx hace que PayPal reintente la entrega más tarde.
 */
export async function POST(request: Request): Promise<Response> {
  const config = billingConfig();
  if (config.provider !== "paypal") return json({ error: "Pagos no configurados." }, { status: 404 });
  if (!config.webhookId) {
    console.error(`[billing] PAYPAL_WEBHOOK_ID no configurado: webhook rechazado${isProduction() ? "" : " (también en desarrollo)"}.`);
    return json({ error: "Webhook no configurado." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return json({ error: "Cuerpo demasiado grande." }, { status: 413 });

  const client = new PayPalClient({ clientId: config.clientId, clientSecret: config.clientSecret, environment: config.environment });
  let verified = false;
  try {
    verified = await verifyPayPalWebhook(client, { headers: readWebhookHeaders(request.headers), webhookId: config.webhookId, rawBody });
  } catch (error) {
    console.error("[billing] no se pudo verificar el webhook con PayPal", error);
    return json({ error: "Error temporal." }, { status: 503 });
  }
  if (!verified) return json({ error: "Firma no válida." }, { status: 401 });

  const provider = getBillingProvider();
  if (!provider) return json({ error: "Pagos no configurados." }, { status: 404 });

  const event = JSON.parse(rawBody) as PayPalWebhookEvent;
  try {
    const outcome = await processPayPalEvent(await getDb(), provider, event);
    return json({ ok: true, outcome });
  } catch (error) {
    console.error("[billing] error procesando webhook", event.event_type, event.id, error);
    return json({ error: "Error temporal." }, { status: 500 });
  }
}
