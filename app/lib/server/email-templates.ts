import { format } from "../../i18n/format";
import type { Locale } from "../../i18n/config";
import type { Messages } from "../../i18n/messages/es-MX";
import type { EmailMessage } from "./mailer";

/**
 * Plantillas de correo transaccional. HTML con estilos en línea (los clientes
 * de correo ignoran hojas de estilo) y versión de texto plano equivalente.
 */

const BRAND = "#0b7a8a";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function layout(locale: Locale, title: string, intro: string, cta: { label: string; url: string }, footnote: string, fallback: string): string {
  return `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#0f2233">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e1e8ee">
<tr><td style="font-size:18px;font-weight:bold;color:${BRAND}">Atlas Anatómico</td></tr>
<tr><td style="padding-top:20px;font-size:22px;font-weight:bold">${escapeHtml(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#3f5162">${escapeHtml(intro)}</td></tr>
<tr><td style="padding-top:24px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px">${escapeHtml(cta.label)}</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;line-height:1.6;color:#5d6f80">${escapeHtml(footnote)}<br>${escapeHtml(fallback)}<br><span style="word-break:break-all">${escapeHtml(cta.url)}</span></td></tr>
</table></td></tr></table></body></html>`;
}

export function verificationEmail(m: Messages, locale: Locale, to: string, name: string, url: string): EmailMessage {
  const e = m.emails;
  const intro = format(e.verifyIntro, { name: name.split(" ")[0] });
  return {
    to,
    subject: e.verifySubject,
    html: layout(locale, e.verifyTitle, intro, { label: e.verifyCta, url }, e.verifyFootnote, e.fallback),
    text: `${intro}\n\n${e.verifyCta}: ${url}\n\n${e.verifyFootnote}`,
  };
}

export function passwordResetEmail(m: Messages, locale: Locale, to: string, name: string, url: string): EmailMessage {
  const e = m.emails;
  const intro = format(e.resetIntro, { name: name.split(" ")[0] });
  return {
    to,
    subject: e.resetSubject,
    html: layout(locale, e.resetTitle, intro, { label: e.resetCta, url }, e.resetFootnote, e.fallback),
    text: `${intro}\n\n${e.resetCta}: ${url}\n\n${e.resetFootnote}`,
  };
}
