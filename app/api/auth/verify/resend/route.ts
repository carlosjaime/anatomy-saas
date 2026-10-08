import { format } from "../../../../i18n/format";
import { localeFromRequest } from "../../../../i18n/server";
import { sendVerificationEmail } from "../../../../lib/server/account-emails";
import { consumeAttempt } from "../../../../lib/server/auth-store";
import { assertSameOrigin, handle, json, requireUser } from "../../../../lib/server/http";

const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 15 * 60 * 1000;

export const POST = handle(async (request, m) => {
  assertSameOrigin(request, m);
  const { db, user } = await requireUser(request, m);
  if (user.emailVerified) return json({ alreadyVerified: true });
  const wait = await consumeAttempt(db, `verify:${user.id}`, Date.now(), RESEND_LIMIT, RESEND_WINDOW_MS);
  if (wait > 0) return json({ error: format(m.errors.waitResend, { minutes: Math.ceil(wait / 60_000) }) }, { status: 429 });
  await sendVerificationEmail(db, request, user, localeFromRequest(request));
  return json({ sent: true });
});
