import { getDb } from "../../../../db";
import { localeFromRequest } from "../../../i18n/server";
import { sendVerificationEmail } from "../../../lib/server/account-emails";
import { registerUser } from "../../../lib/server/auth-store";
import { HttpError, assertSameOrigin, handle, json, readJson, sessionCookie } from "../../../lib/server/http";
import { validateRegistration } from "../../../lib/validation";

export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const result = validateRegistration(await readJson(request, m), m.validation);
  if (!result.ok) throw new HttpError(422, m.validation.fixFields, result.errors as Record<string, string>);

  const db = await getDb();
  const outcome = await registerUser(db, result.data);
  if (!outcome.ok) throw new HttpError(409, m.errors.emailTaken, { email: m.errors.emailTakenField });

  // El registro no depende del correo: si el envío falla, el usuario puede
  // reenviarlo desde su cuenta.
  await sendVerificationEmail(db, request, outcome.user, localeFromRequest(request)).catch((error) =>
    console.error("[mail] verificación", error),
  );
  return json(
    { user: outcome.user },
    { status: 201, headers: { "Set-Cookie": sessionCookie(request, outcome.token, outcome.expiresAt) } },
  );
});
