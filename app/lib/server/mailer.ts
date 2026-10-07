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

export function getMailer(): Mailer {
  const config = mailConfig();
  if (config.provider === "resend") return resendMailer(config);
  if (config.provider === "console") return consoleMailer;
  return async () => {
    throw new EmailUnavailableError();
  };
}
