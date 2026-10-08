import type { Database } from "../../../db";
import type { Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { appUrl } from "./config";
import { issueEmailToken } from "./email-tokens";
import { passwordResetEmail, verificationEmail } from "./email-templates";
import { getMailer } from "./mailer";

type Recipient = { id: string; email: string; name: string };

export async function sendVerificationEmail(db: Database, request: Request, user: Recipient, locale: Locale): Promise<void> {
  const token = await issueEmailToken(db, user.id, "verify");
  const url = `${appUrl(request)}/verificar?token=${encodeURIComponent(token)}`;
  await getMailer()(verificationEmail(getMessages(locale), locale, user.email, user.name, url));
}

export async function sendPasswordResetEmail(db: Database, request: Request, user: Recipient, locale: Locale): Promise<void> {
  const token = await issueEmailToken(db, user.id, "reset");
  const url = `${appUrl(request)}/restablecer?token=${encodeURIComponent(token)}`;
  await getMailer()(passwordResetEmail(getMessages(locale), locale, user.email, user.name, url));
}
