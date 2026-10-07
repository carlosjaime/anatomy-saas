import type { Database } from "../../../db";
import { appUrl } from "./config";
import { issueEmailToken } from "./email-tokens";
import { passwordResetEmail, verificationEmail } from "./email-templates";
import { getMailer } from "./mailer";

type Recipient = { id: string; email: string; name: string };

export async function sendVerificationEmail(db: Database, request: Request, user: Recipient): Promise<void> {
  const token = await issueEmailToken(db, user.id, "verify");
  const url = `${appUrl(request)}/verificar?token=${encodeURIComponent(token)}`;
  await getMailer()(verificationEmail(user.email, user.name, url));
}

export async function sendPasswordResetEmail(db: Database, request: Request, user: Recipient): Promise<void> {
  const token = await issueEmailToken(db, user.id, "reset");
  const url = `${appUrl(request)}/restablecer?token=${encodeURIComponent(token)}`;
  await getMailer()(passwordResetEmail(user.email, user.name, url));
}
