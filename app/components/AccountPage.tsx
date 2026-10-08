import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, Clock, CreditCard, MailWarning, ShieldCheck } from "lucide-react";
import { CancelSubscriptionButton, ResendVerificationButton } from "./AccountForms";
import { DashShell, roleLabel } from "./dashboard/DashShell";
import { Confetti } from "./ui/Confetti";
import type { Locale } from "../i18n/config";
import { format } from "../i18n/format";
import type { Messages } from "../i18n/messages/es-MX";
import { formatMXN, isPlanId } from "../lib/plans";
import type { SessionUser } from "../lib/server/auth-store";
import type { BillingSummary } from "../lib/server/billing/service";

type Props = {
  user: SessionUser;
  billing: BillingSummary;
  now: number;
  notice: string | null;
  syncFailed: boolean;
  paymentsEnabled: boolean;
  locale: Locale;
  m: Messages;
};

export function AccountPage({ user, billing, now, notice, syncFailed, paymentsEnabled, locale, m }: Props) {
  const a = m.account;
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
  const formatDate = (timestamp: number | null) => (timestamp ? dateFormat.format(timestamp) : "—");
  const current = billing.current;
  const currentPlan = current && isPlanId(current.plan) ? m.plans.catalog[current.plan] : null;
  const inTrial = Boolean(current?.trialEndsAt && current.trialEndsAt > now && current.status === "authorized");
  const cancelled = current?.status === "cancelled";
  const activated = notice === "return" && current?.status === "authorized";
  const banner = activated
    ? { tone: "success" as const, text: format(a.activated, { plan: currentPlan?.name ?? "" }) }
    : notice === "return"
      ? { tone: "info" as const, text: a.returnNotice }
      : notice === "cancelled"
        ? { tone: "info" as const, text: a.cancelledNotice }
        : undefined;

  return (
    <DashShell user={user} active="account" m={m}>
      {activated && <Confetti />}
      <header className="dash-header animate__animated animate__fadeInDown">
        <div>
          <span className="eyebrow">{a.eyebrow}</span>
          <h1>{a.title}</h1>
          <p>{user.email}</p>
        </div>
      </header>

      {banner && (
        <p className={`${banner.tone === "success" ? "form-success" : "form-info"} animate__animated ${banner.tone === "success" ? "animate__bounceIn" : "animate__fadeInDown"}`} role="status" data-testid="account-banner">
          {banner.tone === "success" ? <CheckCircle2 size={16} /> : <Clock size={16} />} {banner.text}
        </p>
      )}
      {syncFailed && (
        <p className="form-alert animate__animated animate__headShake" role="alert">
          <AlertTriangle size={16} /> {a.syncFailed}
        </p>
      )}

      <div className="account-grid">
        <section className="dash-card account-plan" aria-labelledby="plan-title">
          <header><h2 id="plan-title"><CreditCard size={17} /> {a.subscription}</h2></header>
          <div className="account-plan-head">
            <div>
              <small>{a.currentPlan}</small>
              <strong data-testid="current-plan">{m.plans.catalog[user.plan].name}</strong>
            </div>
            {current && (
              <span className={`status-pill ${cancelled ? "cancelled" : inTrial ? "trial" : "active"}`}>
                {cancelled ? a.cancelled : inTrial ? a.trial : a.active}
              </span>
            )}
          </div>

          {current ? (
            <dl className="account-facts">
              <div><dt>{a.billing}</dt><dd>{format(current.cycle === "annual" ? a.amountYear : a.amountMonth, { amount: formatMXN(current.amount) })}</dd></div>
              {inTrial && <div><dt>{a.trialUntil}</dt><dd>{formatDate(current.trialEndsAt)}</dd></div>}
              {cancelled ? (
                <div><dt>{a.accessUntil}</dt><dd>{formatDate(current.accessUntil)}</dd></div>
              ) : (
                <div><dt>{inTrial ? a.firstCharge : a.nextCharge}</dt><dd>{formatDate(current.nextPaymentAt)}</dd></div>
              )}
              <div><dt>{a.processor}</dt><dd>{current.provider === "mercadopago" ? "Mercado Pago" : a.demo}</dd></div>
            </dl>
          ) : (
            <p className="account-empty">
              {user.trialAvailable
                ? a.emptyTrial
                : a.emptyNoTrial}
            </p>
          )}

          {billing.pending && !current && (
            <p className="form-info"><Clock size={16} /> {a.pending}</p>
          )}

          <div className="account-actions">
            {paymentsEnabled ? (
              <Link className="btn btn-primary btn-shine" href="/atlas?panel=plans">
                {current && !cancelled ? a.changePlan : user.trialAvailable ? a.startTrial : a.viewPlans} <ArrowRight size={16} />
              </Link>
            ) : (
              <p className="form-info"><AlertTriangle size={16} /> {a.paymentsOff}</p>
            )}
            {current && !cancelled && (
              <CancelSubscriptionButton
                accessNote={format(a.cancelNote, {
                  plan: currentPlan?.name ?? "",
                  date: formatDate(Math.max(current.nextPaymentAt ?? 0, current.trialEndsAt ?? 0) || now),
                })}
              />
            )}
          </div>
          <p className="account-secure"><ShieldCheck size={14} /> {a.secure}</p>
        </section>

        <section className="dash-card" aria-labelledby="profile-title">
          <header><h2 id="profile-title"><BadgeCheck size={17} /> {a.profile}</h2></header>
          <dl className="account-facts">
            <div><dt>{a.name}</dt><dd>{user.name}</dd></div>
            <div><dt>{a.role}</dt><dd>{roleLabel(user, m)}</dd></div>
            {user.institution && <div><dt>{a.institution}</dt><dd>{user.institution}</dd></div>}
            <div>
              <dt>{a.email}</dt>
              <dd className="email-status">
                {user.email}
                {user.emailVerified ? (
                  <span className="status-pill active"><CheckCircle2 size={12} /> {a.verified}</span>
                ) : (
                  <span className="status-pill pending"><MailWarning size={12} /> {a.unverified}</span>
                )}
              </dd>
            </div>
            <div><dt>{a.memberSince}</dt><dd><CalendarClock size={13} /> {formatDate(user.createdAt)}</dd></div>
          </dl>
          {!user.emailVerified && (
            <div className="verify-banner compact">
              <p>{a.verifyPrompt}</p>
              <ResendVerificationButton />
            </div>
          )}
          <Link className="btn btn-outline" href="/recuperar">{a.changePassword}</Link>
        </section>
      </div>
    </DashShell>
  );
}
