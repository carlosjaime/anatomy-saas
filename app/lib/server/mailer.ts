import { mailConfig, type MailConfig } from "./config";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

export class EmailUnavailableError extends Error {
  constructor(message = "El envío de correos no está configurado.") {
    super(message);
    this.name = "EmailUnavailableError";
  }
}

export type Mailer = (message: EmailMessage) => Promise<void>;

/** Resend vía HTTP (`fetch`): funciona igual en Node, Vercel y Workers. */
function resendMailer(config: Extract<MailConfig, { provider: "resend" }>): Mailer {
  return async (message) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend respondió ${response.status}: ${detail.slice(0, 200)}`);
    }
  };
}

/** Desarrollo: imprime el correo (y sus enlaces) en la consola del servidor. */
const consoleMailer: Mailer = async (message) => {
  console.info(`\n[correo de desarrollo] Para: ${message.to}\nAsunto: ${message.subject}\n${message.text}\n`);
};

// Buzón de pruebas E2E. En `globalThis` para compartirse entre los bundles de
// rutas que Next.js carga por separado dentro del mismo proceso.
const MAILBOX_KEY = Symbol.for("atlas-anatomico.e2e-mailbox");
const MAILBOX_LIMIT = 200;
const mailbox: EmailMessage[] = ((globalThis as Record<symbol, unknown>)[MAILBOX_KEY] ??= []) as EmailMessage[];

const memoryMailer: Mailer = async (message) => {
  mailbox.push(message);
  if (mailbox.length > MAILBOX_LIMIT) mailbox.splice(0, mailbox.length - MAILBOX_LIMIT);
};

/** Correos recibidos por una dirección (solo con el buzón de pruebas activo). */
export function readMailbox(to: string): EmailMessage[] {
  const address = to.trim().toLowerCase();
  return mailbox.filter((message) => message.to.toLowerCase() === address);
}

export function getMailer(): Mailer {
  const config = mailConfig();
  if (config.provider === "resend") return resendMailer(config);
  if (config.provider === "console") return consoleMailer;
  if (config.provider === "memory") return memoryMailer;
  return async () => {
    throw new EmailUnavailableError();
  };
}
