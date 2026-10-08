import { DatabaseUnavailableError, getDb } from "../../../../db";
import { revokeSession } from "../../../lib/server/auth-store";
import { assertSameOrigin, clearSessionCookie, handle, json, readSessionToken } from "../../../lib/server/http";

export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const token = readSessionToken(request);
  if (token) {
    try {
      await revokeSession(await getDb(), token);
    } catch (error) {
      // Aunque la BD no responda, la cookie se borra del navegador.
      if (!(error instanceof DatabaseUnavailableError)) throw error;
    }
  }
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
});
