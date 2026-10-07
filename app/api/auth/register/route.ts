import { getDb } from "../../../../db";
import { registerUser } from "../../../lib/server/auth-store";
import { HttpError, assertSameOrigin, handle, json, readJson, sessionCookie } from "../../../lib/server/http";
import { validateRegistration } from "../../../lib/validation";

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const result = validateRegistration(await readJson(request));
  if (!result.ok) throw new HttpError(422, "Revisa los campos marcados.", result.errors as Record<string, string>);

  const outcome = await registerUser(await getDb(), result.data);
  if (!outcome.ok) {
    throw new HttpError(409, "Ya existe una cuenta con ese correo.", { email: "Este correo ya está registrado. ¿Quieres iniciar sesión?" });
  }
  return json(
    { user: outcome.user },
    { status: 201, headers: { "Set-Cookie": sessionCookie(request, outcome.token, outcome.expiresAt) } },
  );
});
