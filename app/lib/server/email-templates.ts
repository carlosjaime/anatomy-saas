import type { EmailMessage } from "./mailer";

/**
 * Plantillas de correo transaccional. HTML con estilos en línea (los clientes
 * de correo ignoran hojas de estilo) y versión de texto plano equivalente.
 */

const BRAND = "#0b7a8a";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function layout(title: string, intro: string, cta: { label: string; url: string }, footnote: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#0f2233">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e1e8ee">
<tr><td style="font-size:18px;font-weight:bold;color:${BRAND}">Atlas Anatómico</td></tr>
<tr><td style="padding-top:20px;font-size:22px;font-weight:bold">${escapeHtml(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#3f5162">${escapeHtml(intro)}</td></tr>
<tr><td style="padding-top:24px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px">${escapeHtml(cta.label)}</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;line-height:1.6;color:#5d6f80">${escapeHtml(footnote)}<br>Si el botón no funciona, copia este enlace:<br><span style="word-break:break-all">${escapeHtml(cta.url)}</span></td></tr>
</table></td></tr></table></body></html>`;
}

export function verificationEmail(to: string, name: string, url: string): EmailMessage {
  const firstName = name.split(" ")[0];
  const intro = `Hola ${firstName}, confirma tu correo para activar tu cuenta y poder suscribirte a un plan.`;
  const footnote = "El enlace vence en 48 horas. Si no creaste esta cuenta, ignora este mensaje.";
  return {
    to,
    subject: "Confirma tu correo — Atlas Anatómico",
    html: layout("Confirma tu correo", intro, { label: "Confirmar correo", url }, footnote),
    text: `${intro}\n\nConfirmar correo: ${url}\n\n${footnote}`,
  };
}

export function passwordResetEmail(to: string, name: string, url: string): EmailMessage {
  const firstName = name.split(" ")[0];
  const intro = `Hola ${firstName}, recibimos una solicitud para restablecer tu contraseña.`;
  const footnote = "El enlace vence en 1 hora y solo funciona una vez. Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.";
  return {
    to,
    subject: "Restablece tu contraseña — Atlas Anatómico",
    html: layout("Restablece tu contraseña", intro, { label: "Crear nueva contraseña", url }, footnote),
    text: `${intro}\n\nCrear nueva contraseña: ${url}\n\n${footnote}`,
  };
}
