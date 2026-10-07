import { and, eq, gt, lt } from "drizzle-orm";
import type { Database } from "../../../db";
import { authAttempts, sessions, users, type UserRow } from "../../../db/schema";
import { parsePlan, type PlanId } from "../plans";
import type { LoginInput, RegistrationInput, RoleId } from "../validation";
import { hashPassword, randomToken, sha256Hex, verifyPassword } from "./crypto";

/**
 * Reglas de negocio de cuentas y sesiones. Recibe la base de datos como
 * parámetro para poder probarse contra SQLite en memoria.
 */

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  institution: string | null;
  plan: PlanId;
  createdAt: number;
};

export type AuthFailure =
  | { ok: false; reason: "email_taken" }
  | { ok: false; reason: "invalid_credentials" }
  | { ok: false; reason: "rate_limited"; retryAfterMs: number };

export type AuthSuccess = { ok: true; user: SessionUser; token: string; expiresAt: number };

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    institution: row.institution,
    plan: parsePlan(row.plan),
    createdAt: row.createdAt,
  };
}

/**
 * Hash ficticio para igualar el costo de verificación cuando el correo no
 * existe: sin esto, la latencia revelaría qué correos están registrados.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= hashPassword(randomToken(16));
  return dummyHash;
}

async function issueSession(db: Database, userId: string, now: number) {
  const token = randomToken(32);
  const expiresAt = now + SESSION_TTL_MS;
  await db.insert(sessions).values({ id: await sha256Hex(token), userId, expiresAt, createdAt: now });
  // Limpieza oportunista de sesiones vencidas del mismo usuario.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));
  return { token, expiresAt };
}

export async function registerUser(db: Database, input: RegistrationInput, now = Date.now()): Promise<AuthSuccess | AuthFailure> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).get();
  if (existing) return { ok: false, reason: "email_taken" };

  const row: UserRow = {
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    institution: input.institution,
    plan: "free",
    createdAt: now,
  };
  try {
    await db.insert(users).values(row);
  } catch (error) {
    // Carrera entre dos registros simultáneos con el mismo correo.
    if (String((error as Error)?.message ?? error).includes("UNIQUE")) return { ok: false, reason: "email_taken" };
    throw error;
  }
  const session = await issueSession(db, row.id, now);
  return { ok: true, user: toSessionUser(row), ...session };
}

/** Cuenta un intento en una ventana fija; devuelve cuánto esperar si se excede. */
async function consumeAttempt(db: Database, key: string, now: number): Promise<number> {
  const current = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).get();
  if (!current || now - current.windowStart >= LOGIN_WINDOW_MS) {
    await db
      .insert(authAttempts)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({ target: authAttempts.key, set: { count: 1, windowStart: now } });
    return 0;
  }
  if (current.count >= LOGIN_MAX_ATTEMPTS) return current.windowStart + LOGIN_WINDOW_MS - now;
  await db.update(authAttempts).set({ count: current.count + 1 }).where(eq(authAttempts.key, key));
  return 0;
}

export async function loginUser(db: Database, input: LoginInput, now = Date.now()): Promise<AuthSuccess | AuthFailure> {
  const attemptKey = `login:${input.email}`;
  const retryAfterMs = await consumeAttempt(db, attemptKey, now);
  if (retryAfterMs > 0) return { ok: false, reason: "rate_limited", retryAfterMs };

  const row = await db.select().from(users).where(eq(users.email, input.email)).get();
  const valid = await verifyPassword(input.password, row?.passwordHash ?? (await getDummyHash()));
  if (!row || !valid) return { ok: false, reason: "invalid_credentials" };

  await db.delete(authAttempts).where(eq(authAttempts.key, attemptKey));
  const session = await issueSession(db, row.id, now);
  return { ok: true, user: toSessionUser(row), ...session };
}

export async function getUserBySessionToken(db: Database, token: string, now = Date.now()): Promise<SessionUser | null> {
  if (!token || token.length > 128) return null;
  const row = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, await sha256Hex(token)), gt(sessions.expiresAt, now)))
    .get();
  return row ? toSessionUser(row.user) : null;
}

export async function revokeSession(db: Database, token: string): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, await sha256Hex(token)));
}

export async function updateUserPlan(db: Database, userId: string, plan: PlanId): Promise<void> {
  await db.update(users).set({ plan }).where(eq(users.id, userId));
}
