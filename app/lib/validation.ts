/**
 * Validación de formularios de cuenta, compartida por cliente y servidor para
 * que los mensajes sean idénticos en ambos lados. El servidor siempre vuelve a
 * validar: el cliente solo adelanta la retroalimentación.
 */

export const ROLE_OPTIONS = [
  { id: "estudiante", label: "Estudiante de medicina" },
  { id: "interno", label: "Médico interno" },
  { id: "residente", label: "Residente" },
  { id: "medico", label: "Médico especialista o general" },
  { id: "docente", label: "Docente" },
  { id: "otro", label: "Otro profesional de la salud" },
] as const;

export type RoleId = (typeof ROLE_OPTIONS)[number]["id"];

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
  return ROLE_OPTIONS.some((option) => option.id === value);
}

export function validateEmail(email: string): string | null {
  if (!email) return "Ingresa tu correo electrónico.";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return "Ingresa un correo electrónico válido.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Usa como máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return "Combina letras y números.";
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
  return validatePassword(password) ? Math.min(score, 1) : Math.max(score, 2);
}

export function validateRegistration(raw: Record<string, unknown>): ValidationResult<RegistrationInput> {
  const errors: FieldErrors<RegistrationInput> = {};
  const name = asString(raw.name).trim().replace(/\s+/g, " ");
  const email = normalizeEmail(raw.email);
  const password = asString(raw.password);
  const institution = asString(raw.institution).trim().replace(/\s+/g, " ");

  if (name.length < 2) errors.name = "Ingresa tu nombre completo.";
  else if (name.length > 80) errors.name = "El nombre es demasiado largo.";
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (!isRole(raw.role)) errors.role = "Selecciona tu perfil.";
  if (institution.length > 120) errors.institution = "El nombre de la institución es demasiado largo.";
  if (raw.terms !== true) errors.terms = "Debes aceptar los términos para continuar.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { name, email, password, role: raw.role as RoleId, institution: institution || null },
  };
}

export function validateLogin(raw: Record<string, unknown>): ValidationResult<LoginInput> {
  const email = normalizeEmail(raw.email);
  const password = asString(raw.password);
  const errors: FieldErrors<LoginInput> = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = "Ingresa tu contraseña.";
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = "Contraseña no válida.";
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
