import { isPlanId } from "../../../lib/plans";
import { updateUserPlan } from "../../../lib/server/auth-store";
import { HttpError, assertSameOrigin, handle, json, readJson, requireUser } from "../../../lib/server/http";

/**
 * Cambio de plan de demostración: no procesa pagos. En producción esta ruta
 * se sustituye por el webhook del proveedor de pagos, que es la única fuente
 * confiable para otorgar un plan de pago.
 */
export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const body = await readJson(request);
  if (!isPlanId(body.plan)) throw new HttpError(422, "Plan no válido.");
  const { db, user } = await requireUser(request);
  await updateUserPlan(db, user.id, body.plan);
  return json({ plan: body.plan });
});
