import { getDb } from "../../../../db";
import { format } from "../../../i18n/format";
import { loginUser } from "../../../lib/server/auth-store";
import { HttpError, assertSameOrigin, handle, json, readJson, sessionCookie } from "../../../lib/server/http";
import { validateLogin } from "../../../lib/validation";

export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const result = validateLogin(await readJson(request, m), m.validation);
  if (!result.ok) throw new HttpError(422, m.validation.fixFields, result.errors as Record<string, string>);

  const outcome = await loginUser(await getDb(), result.data);
  if (!outcome.ok) {
    if (outcome.reason === "rate_limited") {
      const minutes = Math.max(1, Math.ceil(outcome.retryAfterMs / 60_000));
      return json(
        { error: format(m.errors.rateLimited, { minutes }) },
        { status: 429, headers: { "Retry-After": String(Math.ceil(outcome.retryAfterMs / 1000)) } },
      );
    }
    // Mensaje genérico: no revela si el correo existe.
    throw new HttpError(401, m.errors.invalidCredentials);
  }
  return json({ user: outcome.user }, { headers: { "Set-Cookie": sessionCookie(request, outcome.token, outcome.expiresAt) } });
});
