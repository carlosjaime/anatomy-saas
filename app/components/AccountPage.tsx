import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, Clock, CreditCard, MailWarning, ShieldCheck } from "lucide-react";
import { CancelSubscriptionButton, ResendVerificationButton } from "./AccountForms";
import { DashShell } from "./dashboard/DashShell";
import { formatMXN, isPlanId, planById } from "../lib/plans";
import { ROLE_OPTIONS } from "../lib/validation";
import type { SessionUser } from "../lib/server/auth-store";
import type { BillingSummary } from "../lib/server/billing/service";

const dateFormat = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

function formatDate(timestamp: number | null): string {
  return timestamp ? dateFormat.format(timestamp) : "—";
}

const NOTICES: Record<string, { tone: "success" | "info"; text: string }> = {
  return: { tone: "info", text: "Estamos confirmando tu pago con Mercado Pago. Tu plan se activa en cuanto lo autorice; puede tardar unos minutos." },
  cancelled: { tone: "info", text: "Cancelaste tu suscripción. Conservas el acceso hasta el final del periodo pagado y no se harán más cobros." },
};

type Props = {
  user: SessionUser;
  billing: BillingSummary;
  now: number;
  notice: string | null;
  syncFailed: boolean;
  paymentsEnabled: boolean;
};

export function AccountPage({ user, billing, now, notice, syncFailed, paymentsEnabled }: Props) {
  const role = ROLE_OPTIONS.find((option) => option.id === user.role)?.label ?? "Profesional de la salud";
  const current = billing.current;
  const currentPlan = current && isPlanId(current.plan) ? planById[current.plan] : null;
  const inTrial = Boolean(current?.trialEndsAt && current.trialEndsAt > now && current.status === "authorized");
  const cancelled = current?.status === "cancelled";
  const activated = notice === "return" && current?.status === "authorized";
  const banner = activated
    ? { tone: "success" as const, text: `¡Listo! Tu plan ${currentPlan?.name ?? ""} está activo.` }
    : notice
      ? NOTICES[notice]
      : undefined;

  return (
    <DashShell user={user} active="account">
      <header className="dash-header">
        <div>
          <span className="eyebrow">Configuración</span>
          <h1>Mi cuenta</h1>
          <p>{user.email}</p>
        </div>
      </header>

      {banner && (
        <p className={banner.tone === "success" ? "form-success" : "form-info"} role="status">
          {banner.tone === "success" ? <CheckCircle2 size={16} /> : <Clock size={16} />} {banner.text}
        </p>
      )}
      {syncFailed && (
        <p className="form-alert" role="alert">
          <AlertTriangle size={16} /> No pudimos consultar el estado del pago. Si ya pagaste, tu plan se activará automáticamente en unos minutos.
        </p>
      )}

      <div className="account-grid">
        <section className="dash-card account-plan" aria-labelledby="plan-title">
          <header><h2 id="plan-title"><CreditCard size={17} /> Suscripción</h2></header>
          <div className="account-plan-head">
            <div>
              <small>Plan actual</small>
              <strong>{planById[user.plan].name}</strong>
            </div>
            {current && (
              <span className={`status-pill ${cancelled ? "cancelled" : inTrial ? "trial" : "active"}`}>
                {cancelled ? "Cancelada" : inTrial ? "Prueba gratis" : "Activa"}
              </span>
            )}
          </div>

          {current ? (
            <dl className="account-facts">
              <div><dt>Facturación</dt><dd>{formatMXN(current.amount)} MXN {current.cycle === "annual" ? "al año" : "al mes"}</dd></div>
              {inTrial && <div><dt>Prueba gratis hasta</dt><dd>{formatDate(current.trialEndsAt)}</dd></div>}
              {cancelled ? (
                <div><dt>Acceso hasta</dt><dd>{formatDate(current.accessUntil)}</dd></div>
              ) : (
                <div><dt>{inTrial ? "Primer cobro" : "Próximo cobro"}</dt><dd>{formatDate(current.nextPaymentAt)}</dd></div>
              )}
              <div><dt>Procesador</dt><dd>{current.provider === "mercadopago" ? "Mercado Pago" : "Demostración"}</dd></div>
            </dl>
          ) : (
            <p className="account-empty">
              {user.trialAvailable
                ? "Prueba cualquier plan de pago 7 días gratis. Puedes cancelar antes del primer cobro."
                : "Suscríbete para desbloquear los 9 órganos, la enciclopedia completa y la correlación clínica."}
            </p>
          )}

          {billing.pending && !current && (
            <p className="form-info"><Clock size={16} /> Tienes un pago en proceso de confirmación.</p>
          )}

          <div className="account-actions">
            {paymentsEnabled ? (
              <Link className="btn btn-primary" href="/atlas?panel=plans">
                {current && !cancelled ? "Cambiar de plan" : user.trialAvailable ? "Empezar prueba gratis" : "Ver planes"} <ArrowRight size={16} />
              </Link>
            ) : (
              <p className="form-info"><AlertTriangle size={16} /> Los pagos no están disponibles en este momento.</p>
            )}
            {current && !cancelled && (
              <CancelSubscriptionButton
                accessNote={`Si cancelas, conservas el plan ${currentPlan?.name ?? ""} hasta el ${formatDate(Math.max(current.nextPaymentAt ?? 0, current.trialEndsAt ?? 0) || now)} y no se harán más cobros.`}
              />
            )}
          </div>
          <p className="account-secure"><ShieldCheck size={14} /> Los pagos se procesan en Mercado Pago. Atlas Anatómico nunca ve ni guarda los datos de tu tarjeta.</p>
        </section>

        <section className="dash-card" aria-labelledby="profile-title">
          <header><h2 id="profile-title"><BadgeCheck size={17} /> Perfil</h2></header>
          <dl className="account-facts">
            <div><dt>Nombre</dt><dd>{user.name}</dd></div>
            <div><dt>Perfil</dt><dd>{role}</dd></div>
            {user.institution && <div><dt>Institución</dt><dd>{user.institution}</dd></div>}
            <div>
              <dt>Correo</dt>
              <dd className="email-status">
                {user.email}
                {user.emailVerified ? (
                  <span className="status-pill active"><CheckCircle2 size={12} /> Verificado</span>
                ) : (
                  <span className="status-pill pending"><MailWarning size={12} /> Sin verificar</span>
                )}
              </dd>
            </div>
            <div><dt>Miembro desde</dt><dd><CalendarClock size={13} /> {formatDate(user.createdAt)}</dd></div>
          </dl>
          {!user.emailVerified && (
            <div className="verify-banner compact">
              <p>Confirma tu correo para poder suscribirte.</p>
              <ResendVerificationButton />
            </div>
          )}
          <Link className="btn btn-outline" href="/recuperar">Cambiar contraseña</Link>
        </section>
      </div>
    </DashShell>
  );
}
