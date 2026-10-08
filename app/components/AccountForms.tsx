"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Loader2, MailCheck, XCircle } from "lucide-react";
import { useI18n } from "../i18n/client";
import { postJson } from "../lib/client-api";
import { PASSWORD_MIN_LENGTH, normalizeEmail, passwordStrength, validateEmail, validatePassword } from "../lib/validation";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { flashToast, useToast } from "./ui/Toast";
import { startNavigationProgress } from "./ui/NavigationProgress";
import { replayAnimation } from "./ui/animate";

function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p className={`${tone === "error" ? "form-alert" : "form-success"} animate__animated animate__fadeInDown`} role={tone === "error" ? "alert" : "status"}>
      {tone === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {children}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <span className="field-error" id={id}>
      <AlertCircle size={13} /> {message}
    </span>
  );
}

export function ForgotPasswordForm() {
  const id = useId();
  const { m } = useI18n();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeEmail(email);
  const fieldError = touched ? validateEmail(normalized, m.validation) : null;
  const isValid = touched && !fieldError;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError(null);
    if (validateEmail(normalized, m.validation)) {
      replayAnimation(formRef.current, "headShake");
      document.getElementById(`${id}-email`)?.focus();
      return;
    }
    setSubmitting(true);
    const result = await postJson<{ message: string }>("/api/auth/password/forgot", { email: normalized });
    setSubmitting(false);
    if (result.ok) {
      setSent(result.data.message);
      toast.success(m.toasts.linkSent);
    } else {
      setError(result.error);
      replayAnimation(formRef.current, "headShake");
    }
  };

  if (sent) {
    return (
      <div className="auth-result animate__animated animate__zoomIn" data-testid="forgot-sent">
        <span className="auth-result-icon animate__animated animate__bounceIn"><MailCheck size={26} /></span>
        <p>{sent}</p>
        <small>{m.auth.checkSpam}</small>
      </div>
    );
  }

  return (
    <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate data-testid="forgot-form">
      {error && <Alert tone="error">{error}</Alert>}
      <div className={`field ${isValid ? "is-valid" : ""}`}>
        <label htmlFor={`${id}-email`}>{m.auth.email}</label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldError) || undefined}
          aria-describedby={fieldError ? `${id}-email-error` : undefined}
          placeholder={m.auth.emailPlaceholder}
        />
        {isValid && <Check size={16} className="valid-mark" aria-hidden="true" />}
        <FieldError id={`${id}-email-error`} message={fieldError} />
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting} data-testid="forgot-submit">
        {submitting ? <Loader2 size={18} className="spin" /> : null}
        {submitting ? m.common.sending : m.auth.sendLink}
        {!submitting && <ArrowRight size={18} />}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const id = useId();
  const { m, t } = useI18n();
  const a = m.auth;
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // La validación se deriva del estado: tras el primer envío acompaña la escritura
  // y cambia de idioma al instante junto con el resto de la interfaz.
  const passwordError = touched ? validatePassword(password, m.validation) : null;
  const confirmError = touched && password !== confirm ? m.validation.passwordMismatch : null;
  const strength = passwordStrength(password);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError(null);
    const invalidPassword = validatePassword(password, m.validation);
    if (invalidPassword || password !== confirm) {
      replayAnimation(formRef.current, "headShake");
      document.getElementById(invalidPassword ? `${id}-password` : `${id}-confirm`)?.focus();
      return;
    }
    setSubmitting(true);
    const result = await postJson("/api/auth/password/reset", { token, password });
    if (result.ok) {
      flashToast(m.toasts.passwordUpdated);
      startNavigationProgress();
      window.location.assign("/dashboard?password=updated");
      return;
    }
    setSubmitting(false);
    setError(result.error);
    replayAnimation(formRef.current, "headShake");
  };

  return (
    <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate data-testid="reset-form">
      {error && <Alert tone="error">{error} <Link href="/recuperar">{a.requestAnother}</Link></Alert>}
      <div className={`field ${touched && !passwordError ? "is-valid" : ""}`}>
        <label htmlFor={`${id}-password`}>{a.newPassword}</label>
        <div className="password-input">
          <input
            id={`${id}-password`}
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={passwordError ? `${id}-password-error` : undefined}
            placeholder={t(a.passwordPlaceholderNew, { min: PASSWORD_MIN_LENGTH })}
          />
          <button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? a.hidePassword : a.showPassword} aria-pressed={show}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {password && (
          <div className="strength" data-level={strength} aria-live="polite">
            <span className="strength-bar"><i /><i /><i /><i /></span>
            <small>{t(a.strength, { level: a.strengthLevels[strength] })}</small>
          </div>
        )}
        <FieldError id={`${id}-password-error`} message={passwordError} />
      </div>
      <div className={`field ${touched && confirm && !confirmError ? "is-valid" : ""}`}>
        <label htmlFor={`${id}-confirm`}>{a.confirmPassword}</label>
        <input
          id={`${id}-confirm`}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={Boolean(confirmError) || undefined}
          aria-describedby={confirmError ? `${id}-confirm-error` : undefined}
        />
        {touched && confirm && !confirmError && <Check size={16} className="valid-mark" aria-hidden="true" />}
        <FieldError id={`${id}-confirm-error`} message={confirmError} />
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting} data-testid="reset-submit">
        {submitting ? <Loader2 size={18} className="spin" /> : null}
        {submitting ? m.common.saving : a.savePassword}
      </button>
    </form>
  );
}

export function ResendVerificationButton() {
  const { m } = useI18n();
  const toast = useToast();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="resend-verification">
      <button
        type="button"
        className={`btn btn-outline ${state === "sent" ? "is-done" : ""}`}
        disabled={state !== "idle"}
        data-testid="resend-verification"
        onClick={async () => {
          setState("sending");
          setError(null);
          const result = await postJson("/api/auth/verify/resend", {});
          if (result.ok) {
            setState("sent");
            toast.success(m.toasts.verificationSent);
          } else {
            setState("idle");
            setError(result.error);
            toast.error(result.error);
          }
        }}
      >
        {state === "sending" ? (
          <Loader2 size={16} className="spin" />
        ) : state === "sent" ? (
          <Check size={16} className="animate__animated animate__bounceIn" />
        ) : (
          <MailCheck size={16} />
        )}
        {state === "sent" ? m.auth.resent : m.auth.resend}
      </button>
      {error && <small className="field-error" role="alert"><AlertCircle size={13} /> {error}</small>}
    </span>
  );
}

export function CancelSubscriptionButton({ accessNote }: { accessNote: string }) {
  const { m } = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const cancel = async () => {
    const result = await postJson("/api/billing/cancel", {});
    if (result.ok) {
      flashToast(m.toasts.subscriptionCancelled, "info");
      startNavigationProgress();
      window.location.assign("/cuenta?billing=cancelled");
      return;
    }
    toast.error(result.error);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="btn btn-ghost danger" onClick={() => setOpen(true)} data-testid="cancel-subscription">
        {m.account.cancel}
      </button>
      <ConfirmDialog
        open={open}
        title={m.confirm.cancelTitle}
        message={accessNote}
        confirmLabel={m.confirm.cancelConfirm}
        cancelLabel={m.confirm.keepPlan}
        tone="danger"
        icon={<XCircle size={24} />}
        onConfirm={cancel}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
