"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { postJson } from "../lib/client-api";
import {
  PASSWORD_MIN_LENGTH,
  ROLE_OPTIONS,
  passwordStrength,
  safeRedirectPath,
  validateLogin,
  validateRegistration,
  type RoleId,
} from "../lib/validation";

type Mode = "login" | "register";
type Fields = { name: string; email: string; password: string; role: RoleId | ""; institution: string; terms: boolean };
type Errors = Partial<Record<keyof Fields, string>>;

const STRENGTH_LABEL = ["", "Débil", "Aceptable", "Buena", "Excelente"];

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const id = useId();
  const [fields, setFields] = useState<Fields>({ name: "", email: "", password: "", role: "", institution: "", terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const destination = safeRedirectPath(next);
  const strength = passwordStrength(fields.password);

  const validate = (values: Fields): Errors => {
    const result = mode === "register" ? validateRegistration(values) : validateLogin(values);
    return result.ok ? {} : (result.errors as Errors);
  };

  const update = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    const nextFields = { ...fields, [key]: value };
    setFields(nextFields);
    // Tras el primer envío, la validación acompaña la escritura.
    if (touched) setErrors(validate(nextFields));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    setFormError(null);
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    const payload =
      mode === "register"
        ? { name: fields.name, email: fields.email, password: fields.password, role: fields.role, institution: fields.institution, terms: fields.terms }
        : { email: fields.email, password: fields.password };
    const result = await postJson(mode === "register" ? "/api/auth/register" : "/api/auth/login", payload);
    if (result.ok) {
      // Navegación completa para que el servidor renderice con la nueva sesión.
      window.location.assign(destination);
      return;
    }
    setSubmitting(false);
    setFormError(result.error);
    if (result.fields) setErrors(result.fields as Errors);
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

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {formError && (
        <p className="form-alert" role="alert">
          <AlertCircle size={16} /> {formError}
        </p>
      )}

      {mode === "register" && (
        <div className="field">
          <label htmlFor={`${id}-name`}>Nombre completo</label>
          <input {...fieldProps("name")} autoComplete="name" value={fields.name} onChange={(e) => update("name", e.target.value)} placeholder="Dra. Ana Pérez" />
          {fieldError("name")}
        </div>
      )}

      <div className="field">
        <label htmlFor={`${id}-email`}>Correo electrónico</label>
        <input {...fieldProps("email")} type="email" inputMode="email" autoComplete="email" value={fields.email} onChange={(e) => update("email", e.target.value)} placeholder="tu@universidad.mx" />
        {fieldError("email")}
      </div>

      <div className="field">
        <label htmlFor={`${id}-password`}>Contraseña</label>
        <div className="password-input">
          <input
            {...fieldProps("password")}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={fields.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder={mode === "register" ? `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` : "Tu contraseña"}
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {mode === "register" && fields.password && (
          <div className="strength" data-level={strength} aria-live="polite">
            <span className="strength-bar"><i /><i /><i /><i /></span>
            <small>Seguridad: {STRENGTH_LABEL[strength] || "Muy débil"}</small>
          </div>
        )}
        {fieldError("password")}
        {mode === "login" && <Link className="forgot-link" href="/recuperar">¿Olvidaste tu contraseña?</Link>}
      </div>

      {mode === "register" && (
        <>
          <fieldset className="field role-field" aria-describedby={errors.role ? `${id}-role-error` : undefined}>
            <legend>¿Cuál es tu perfil?</legend>
            <div className="role-options">
              {ROLE_OPTIONS.map((option, index) => (
                <label key={option.id} className={fields.role === option.id ? "selected" : ""}>
                  <input
                    type="radio"
                    name="role"
                    id={index === 0 ? `${id}-role` : undefined}
                    value={option.id}
                    checked={fields.role === option.id}
                    onChange={() => update("role", option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {fieldError("role")}
          </fieldset>

          <div className="field">
            <label htmlFor={`${id}-institution`}>Institución <span className="optional">(opcional)</span></label>
            <input {...fieldProps("institution")} autoComplete="organization" value={fields.institution} onChange={(e) => update("institution", e.target.value)} placeholder="Universidad u hospital" />
            {fieldError("institution")}
          </div>

          <div className="field">
            <label className="checkbox">
              <input {...fieldProps("terms")} type="checkbox" checked={fields.terms} onChange={(e) => update("terms", e.target.checked)} />
              <span>Acepto los términos de uso y entiendo que el contenido es educativo y no sustituye el juicio clínico.</span>
            </label>
            {fieldError("terms")}
          </div>
        </>
      )}

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
        {submitting ? <Loader2 size={18} className="spin" /> : null}
        {submitting ? (mode === "register" ? "Creando tu cuenta…" : "Entrando…") : mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
        {!submitting && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
