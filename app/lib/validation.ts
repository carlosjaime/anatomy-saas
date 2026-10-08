import { format } from "../i18n/format";
import type { Messages } from "../i18n/messages/es-MX";

/**
 * Validación de formularios de cuenta, compartida por cliente y servidor para
 * que los mensajes sean idénticos en ambos lados. Recibe los textos del idioma
 * activo; el servidor siempre vuelve a validar (el cliente solo adelanta la
 * retroalimentación).
 */

export type ValidationMessages = Messages["validation"];

/** Perfiles profesionales; las etiquetas viven en el diccionario (`roles`). */
export const ROLE_IDS = ["estudiante", "interno", "residente", "medico", "docente", "otro"] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  role: RoleId;
  institution: string | null;
};

export type LoginInput = { email: string; password: string };

export type FieldErrors<T> = Partial<Record<keyof T | "terms", string>>;

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors<T> };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeEmail(value: unknown): string {
  return asString(value).trim().toLowerCase();
}

export function isRole(value: unknown): value is RoleId {
  return (ROLE_IDS as readonly unknown[]).includes(value);
}

export function validateEmail(email: string, v: ValidationMessages): string | null {
  if (!email) return v.emailRequired;
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return v.emailInvalid;
  return null;
}

export function validatePassword(password: string, v: ValidationMessages): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return format(v.passwordMin, { min: PASSWORD_MIN_LENGTH });
  if (password.length > PASSWORD_MAX_LENGTH) return format(v.passwordMax, { max: PASSWORD_MAX_LENGTH });
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return v.passwordMix;
  return null;
}

/** 0–4, para el medidor visual de fortaleza. */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 14) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const meetsPolicy = password.length >= PASSWORD_MIN_LENGTH && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);
  return meetsPolicy ? Math.max(score, 2) : Math.min(score, 1);
}

export function validateRegistration(raw: Record<string, unknown>, v: ValidationMessages): ValidationResult<RegistrationInput> {
  const errors: FieldErrors<RegistrationInput> = {};
  const name = asString(raw.name).trim().replace(/\s+/g, " ");
  const email = normalizeEmail(raw.email);
  const password = asString(raw.password);
  const institution = asString(raw.institution).trim().replace(/\s+/g, " ");

  if (name.length < 2) errors.name = v.nameRequired;
  else if (name.length > 80) errors.name = v.nameTooLong;
  const emailError = validateEmail(email, v);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(password, v);
  if (passwordError) errors.password = passwordError;
  if (!isRole(raw.role)) errors.role = v.roleRequired;
  if (institution.length > 120) errors.institution = v.institutionTooLong;
  if (raw.terms !== true) errors.terms = v.termsRequired;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { name, email, password, role: raw.role as RoleId, institution: institution || null },
  };
}

export function validateLogin(raw: Record<string, unknown>, v: ValidationMessages): ValidationResult<LoginInput> {
  const email = normalizeEmail(raw.email);
  const password = asString(raw.password);
  const errors: FieldErrors<LoginInput> = {};
  const emailError = validateEmail(email, v);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = v.passwordRequired;
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = v.passwordInvalid;
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data: { email, password } };
}

/**
 * Solo acepta rutas relativas del mismo origen como destino tras el login,
 * para evitar redirecciones abiertas (`//evil.com`, `https://…`, `/\\evil`).
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  const path = asString(value);
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path;
}
