import { isE2E } from "../../../lib/server/config";
import { json } from "../../../lib/server/http";
import { readMailbox } from "../../../lib/server/mailer";

export const dynamic = "force-dynamic";

/**
 * Buzón de las pruebas E2E: devuelve los correos enviados a `?to=`. Fuera del
 * modo `ATLAS_E2E` responde 404, como si la ruta no existiera.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isE2E()) return new Response("Not found", { status: 404 });
  const to = new URL(request.url).searchParams.get("to") ?? "";
  return json({ messages: to ? readMailbox(to) : [] });
}
