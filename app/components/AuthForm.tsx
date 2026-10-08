"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useI18n } from "../i18n/client";
import { postJson } from "../lib/client-api";
import type { SessionUser } from "../lib/server/auth-store";
import {
  PASSWORD_MIN_LENGTH,
  ROLE_IDS,
  passwordStrength,
  safeRedirectPath,
  validateLogin,
  validateRegistration,
  type RoleId,
} from "../lib/validation";
import { flashToast } from "./ui/Toast";
import { startNavigationProgress } from "./ui/NavigationProgress";
import { replayAnimation } from "./ui/animate";

type Mode = "login" | "register";
type Fields = { name: string; email: string; password: string; role: RoleId | ""; institution: string; terms: boolean };
type Errors = Partial<Record<keyof Fields, string>>;

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const id = useId();
  const { m, t } = useI18n();
  const a = m.auth;
  const [fields, setFields] = useState<Fields>({ name: "", email: "", password: "", role: "", institution: "", terms: false });
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const destination = safeRedirectPath(next);
  const strength = passwordStrength(fields.password);

  const validate = (values: Fields): Errors => {
    const result = mode === "register" ? validateRegistration(values, m.validation) : validateLogin(values, m.validation);
    return result.ok ? {} : (result.errors as Errors);
  };

  // Tras el primer envío, la validación se deriva del estado en cada render:
  // acompaña la escritura y cambia de idioma al instante con el resto de la UI.
  const errors: Errors = { ...serverErrors, ...(touched ? validate(fields) : {}) };

  const update = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    // Un error del servidor (p. ej. correo ya registrado) deja de aplicar al editar el campo.
    if (serverErrors[key]) {
      setServerErrors((current) => {
        const rest = { ...current };
        delete rest[key];
        return rest;
      });
    }
  };

  const fail = (message: string | null) => {
    setFormError(message);
    replayAnimation(formRef.current, "headShake");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    setFormError(null);
    const found = validate(fields);
    if (Object.keys(found).length > 0) {
      fail(null);
      document.getElementById(`${id}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setServerErrors({});
    setSubmitting(true);
    const payload =
      mode === "register"
        ? { name: fields.name, email: fields.email, password: fields.password, role: fields.role, institution: fields.institution, terms: fields.terms }
        : { email: fields.email, password: fields.password };
    const result = await postJson<{ user: SessionUser }>(mode === "register" ? "/api/auth/register" : "/api/auth/login", payload);
    if (result.ok) {
      setDone(true);
      flashToast(mode === "register" ? m.toasts.registered : t(m.toasts.welcome, { name: result.data.user.name.split(" ")[0] }));
      startNavigationProgress();
      // Navegación completa para que el servidor renderice con la nueva sesión.
      window.location.assign(destination);
      return;
    }
    setSubmitting(false);
    setServerErrors((result.fields as Errors) ?? {});
    fail(result.error);
  };

  const fieldProps = (key: keyof Fields) => ({
    id: `${id}-${key}`,
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
  });

  const fieldError = (key: keyof Fields) =>
    errors[key] ? (
      <span className="field-error" id={`${id}-${key}-error`}>
        <AlertCircle size={13} /> {errors[key]}
      </span>
    ) : null;

  const valid = (key: keyof Fields) => touched && !errors[key] && Boolean(fields[key]);

  return (
    <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate data-testid={`${mode}-form`}>
      {formError && (
        <p className="form-alert" role="alert">
          <AlertCircle size={16} /> {formError}
        </p>
      )}

      {mode === "register" && (
        <div className={`field ${valid("name") ? "is-valid" : ""}`}>
          <label htmlFor={`${id}-name`}>{a.name}</label>
          <input {...fieldProps("name")} autoComplete="name" value={fields.name} onChange={(e) => update("name", e.target.value)} placeholder={a.namePlaceholder} />
          {valid("name") && <Check size={16} className="valid-mark" aria-hidden="true" />}
          {fieldError("name")}
        </div>
      )}

      <div className={`field ${valid("email") ? "is-valid" : ""}`}>
        <label htmlFor={`${id}-email`}>{a.email}</label>
        <input {...fieldProps("email")} type="email" inputMode="email" autoComplete="email" value={fields.email} onChange={(e) => update("email", e.target.value)} placeholder={a.emailPlaceholder} />
        {valid("email") && <Check size={16} className="valid-mark" aria-hidden="true" />}
        {fieldError("email")}
      </div>

      <div className="field">
        <label htmlFor={`${id}-password`}>{a.password}</label>
        <div className="password-input">
          <input
            {...fieldProps("password")}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={fields.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder={mode === "register" ? t(a.passwordPlaceholderNew, { min: PASSWORD_MIN_LENGTH }) : a.passwordPlaceholder}
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? a.hidePassword : a.showPassword} aria-pressed={showPassword}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {mode === "register" && fields.password && (
          <div className="strength" data-level={strength} aria-live="polite">
            <span className="strength-bar"><i /><i /><i /><i /></span>
            <small>{t(a.strength, { level: a.strengthLevels[strength] })}</small>
          </div>
        )}
        {fieldError("password")}
        {mode === "login" && <Link className="forgot-link" href="/recuperar">{a.forgot}</Link>}
      </div>

      {mode === "register" && (
        <>
          <fieldset className="field role-field" aria-describedby={errors.role ? `${id}-role-error` : undefined}>
            <legend>{a.role}</legend>
            <div className="role-options">
              {ROLE_IDS.map((role, index) => (
                <label key={role} className={fields.role === role ? "selected" : ""}>
                  <input type="radio" name="role" id={index === 0 ? `${id}-role` : undefined} value={role} checked={fields.role === role} onChange={() => update("role", role)} />
                  {m.roles[role]}
                </label>
              ))}
            </div>
            {fieldError("role")}
          </fieldset>

          <div className="field">
            <label htmlFor={`${id}-institution`}>{a.institution} <span className="optional">{a.optional}</span></label>
            <input {...fieldProps("institution")} autoComplete="organization" value={fields.institution} onChange={(e) => update("institution", e.target.value)} placeholder={a.institutionPlaceholder} />
            {fieldError("institution")}
          </div>

          <div className="field">
            <label className="checkbox">
              <input {...fieldProps("terms")} type="checkbox" checked={fields.terms} onChange={(e) => update("terms", e.target.checked)} />
              <span>{a.terms}</span>
            </label>
            {fieldError("terms")}
          </div>
        </>
      )}

      <button type="submit" className={`btn btn-primary btn-block btn-lg ${done ? "is-done" : ""}`} disabled={submitting} data-testid="auth-submit">
        {done ? <Check size={18} className="animate__animated animate__bounceIn" /> : submitting ? <Loader2 size={18} className="spin" /> : null}
        {submitting ? (mode === "register" ? a.submittingRegister : a.submittingLogin) : mode === "register" ? a.submitRegister : a.submitLogin}
        {!submitting && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
