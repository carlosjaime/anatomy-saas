"use client";

import { useId, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { postJson } from "../lib/client-api";
import { PASSWORD_MIN_LENGTH, normalizeEmail, validateEmail, validatePassword } from "../lib/validation";

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p className={tone === "error" ? "form-alert" : "form-success"} role={tone === "error" ? "alert" : "status"}>
      {tone === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {children}
    </p>
  );
}

export function ForgotPasswordForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    const invalid = validateEmail(normalized);
    setFieldError(invalid);
    setError(null);
    if (invalid) return;
    setSubmitting(true);
    const result = await postJson<{ message: string }>("/api/auth/password/forgot", { email: normalized });
    setSubmitting(false);
    if (result.ok) setSent(result.data.message);
    else setError(result.error);
  };

  if (sent) {
    return (
      <div className="auth-result">
        <span className="auth-result-icon"><MailCheck size={26} /></span>
        <p>{sent}</p>
        <small>Revisa también la carpeta de spam. El enlace vence en 1 hora.</small>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="field">
        <label htmlFor={`${id}-email`}>Correo electrónico</label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldError) || undefined}
          aria-describedby={fieldError ? `${id}-email-error` : undefined}
          placeholder="tu@universidad.mx"
        />
        {fieldError && <span className="field-error" id={`${id}-email-error`}><AlertCircle size={13} /> {fieldError}</span>}
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
        {submitting ? <Loader2 size={18} className="spin" /> : null}
        {submitting ? "Enviando…" : "Enviar enlace"}
        {!submitting && <ArrowRight size={18} />}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    const invalid = validatePassword(password);
    if (invalid) next.password = invalid;
    if (password !== confirm) next.confirm = "Las contraseñas no coinciden.";
    setErrors(next);
    setError(null);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    const result = await postJson("/api/auth/password/reset", { token, password });
    if (result.ok) {
      window.location.assign("/dashboard?password=updated");
      return;
    }
    setSubmitting(false);
    setError(result.error);
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error} <a href="/recuperar">Solicitar otro enlace</a></Alert>}
      <div className="field">
        <label htmlFor={`${id}-password`}>Nueva contraseña</label>
        <div className="password-input">
          <input
            id={`${id}-password`}
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password) || undefined}
            placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
          />
          <button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {errors.password && <span className="field-error"><AlertCircle size={13} /> {errors.password}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-confirm`}>Confirmar contraseña</label>
        <input
          id={`${id}-confirm`}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={Boolean(errors.confirm) || undefined}
        />
        {errors.confirm && <span className="field-error"><AlertCircle size={13} /> {errors.confirm}</span>}
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
        {submitting ? <Loader2 size={18} className="spin" /> : null}
        {submitting ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

export function ResendVerificationButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="resend-verification">
      <button
        type="button"
        className="btn btn-outline"
        disabled={state !== "idle"}
        onClick={async () => {
          setState("sending");
          setError(null);
          const result = await postJson("/api/auth/verify/resend", {});
          if (result.ok) setState("sent");
          else {
            setState("idle");
            setError(result.error);
          }
        }}
      >
        {state === "sending" ? <Loader2 size={16} className="spin" /> : <MailCheck size={16} />}
        {state === "sent" ? "Correo enviado" : "Reenviar correo"}
      </button>
      {error && <small className="field-error" role="alert"><AlertCircle size={13} /> {error}</small>}
    </span>
  );
}

export function CancelSubscriptionButton({ accessNote }: { accessNote: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost danger" onClick={() => setConfirming(true)}>
        Cancelar suscripción
      </button>
    );
  }
  return (
    <div className="cancel-confirm" role="alertdialog" aria-label="Confirmar cancelación">
      <p>{accessNote}</p>
      {error && <Alert tone="error">{error}</Alert>}
      <div>
        <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)} disabled={pending}>Conservar plan</button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await postJson("/api/billing/cancel", {});
            if (result.ok) {
              window.location.assign("/cuenta?billing=cancelled");
              return;
            }
            setPending(false);
            setError(result.error);
          }}
        >
          {pending ? <Loader2 size={16} className="spin" /> : null} Sí, cancelar
        </button>
      </div>
    </div>
  );
}
