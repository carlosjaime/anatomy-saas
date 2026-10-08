import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { authAttempts } from "../../../../../db/schema";
import { getUserById, issueSession, loadSessionUser, revokeAllSessions, setPassword } from "../../../../lib/server/auth-store";
import { consumeEmailToken } from "../../../../lib/server/email-tokens";
import { HttpError, assertSameOrigin, handle, json, readJson, sessionCookie } from "../../../../lib/server/http";
import { validatePassword } from "../../../../lib/validation";

export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const body = await readJson(request, m);
  const password = typeof body.password === "string" ? body.password : "";
  const passwordError = validatePassword(password, m.validation);
  if (passwordError) throw new HttpError(422, passwordError, { password: passwordError });

  const db = await getDb();
  const userId = await consumeEmailToken(db, typeof body.token === "string" ? body.token : "", "reset");
  if (!userId) throw new HttpError(400, m.errors.resetInvalid);
  const row = await getUserById(db, userId);
  if (!row) throw new HttpError(400, m.errors.resetInvalid);

  await setPassword(db, userId, password);
  // Cualquier sesión abierta con la contraseña anterior deja de ser válida.
  await revokeAllSessions(db, userId);
  await db.delete(authAttempts).where(eq(authAttempts.key, `login:${row.email}`));
  const session = await issueSession(db, userId);
  return json(
    { user: await loadSessionUser(db, row) },
    { headers: { "Set-Cookie": sessionCookie(request, session.token, session.expiresAt) } },
  );
});
