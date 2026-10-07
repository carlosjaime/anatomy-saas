import { getDb } from "../../../../db";
import { sendVerificationEmail } from "../../../lib/server/account-emails";
import { registerUser } from "../../../lib/server/auth-store";
import { HttpError, assertSameOrigin, handle, json, readJson, sessionCookie } from "../../../lib/server/http";
import { validateRegistration } from "../../../lib/validation";

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const result = validateRegistration(await readJson(request));
  if (!result.ok) throw new HttpError(422, "Revisa los campos marcados.", result.errors as Record<string, string>);

  const db = await getDb();
  const outcome = await registerUser(db, result.data);
  if (!outcome.ok) {
    throw new HttpError(409, "Ya existe una cuenta con ese correo.", { email: "Este correo ya está registrado. ¿Quieres iniciar sesión?" });
  }
  // El registro no depende del correo: si el envío falla, el usuario puede
  // reenviarlo desde su cuenta.
  await sendVerificationEmail(db, request, outcome.user).catch((error) => console.error("[mail] verificación", error));
  return json(
    { user: outcome.user },
    { status: 201, headers: { "Set-Cookie": sessionCookie(request, outcome.token, outcome.expiresAt) } },
  );
});
