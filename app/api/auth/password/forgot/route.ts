import { getDb } from "../../../../../db";
import { sendPasswordResetEmail } from "../../../../lib/server/account-emails";
import { consumeAttempt, getUserByEmail } from "../../../../lib/server/auth-store";
import { mailConfig } from "../../../../lib/server/config";
import { EmailUnavailableError } from "../../../../lib/server/mailer";
import { HttpError, assertSameOrigin, handle, json, readJson } from "../../../../lib/server/http";
import { normalizeEmail, validateEmail } from "../../../../lib/validation";

const GENERIC = "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.";

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const email = normalizeEmail((await readJson(request)).email);
  const emailError = validateEmail(email);
  if (emailError) throw new HttpError(422, emailError, { email: emailError });
  // Se valida antes de buscar al usuario para que la respuesta no dependa de si existe.
  if (mailConfig().provider === "none") throw new EmailUnavailableError();

  const db = await getDb();
  // Límite silencioso: la respuesta es idéntica para no revelar nada.
  if ((await consumeAttempt(db, `reset:${email}`, Date.now(), 3, 15 * 60 * 1000)) > 0) return json({ message: GENERIC });
  const user = await getUserByEmail(db, email);
  if (user) {
    await sendPasswordResetEmail(db, request, user).catch((error) => console.error("[mail] restablecimiento", error));
  }
  return json({ message: GENERIC });
});
