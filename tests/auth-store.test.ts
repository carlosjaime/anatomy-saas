import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@libsql/client";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { connect, type Database } from "../db/index.ts";
import { USER_ROLES, authAttempts, sessions, studyEvents, users } from "../db/schema.ts";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  SESSION_TTL_MS,
  getUserBySessionToken,
  loginUser,
  registerUser,
  revokeSession,
  updateUserPlan,
} from "../app/lib/server/auth-store.ts";
import { hashPassword, verifyPassword } from "../app/lib/server/crypto.ts";
import { aggregateStats, computeStreak, getDashboardStats, recordStudyEvent, VIEW_DEDUPE_MS } from "../app/lib/server/progress-store.ts";
import { ROLE_OPTIONS, safeRedirectPath, validateRegistration } from "../app/lib/validation.ts";

async function freshDb(): Promise<Database> {
  return connect(createClient({ url: ":memory:" }));
}

const ana = { name: "Ana Pérez", email: "ana@hospital.mx", password: "Anatomia2026", role: "residente" as const, institution: "UNAM" };

test("bootstrap DDL matches every column declared in the Drizzle schema", async () => {
  const client = createClient({ url: ":memory:" });
  await connect(client);
  for (const table of [users, sessions, authAttempts, studyEvents]) {
    const config = getTableConfig(table);
    const info = await client.execute(`PRAGMA table_info(${config.name})`);
    const actual = new Set(info.rows.map((row) => String(row.name)));
    for (const column of config.columns) assert.ok(actual.has(column.name), `${config.name}.${column.name} missing from DDL`);
    assert.equal(actual.size, config.columns.length, `${config.name} has extra DDL columns`);
  }
});

test("role ids are shared between validation and schema", () => {
  assert.deepEqual(ROLE_OPTIONS.map((option) => option.id), [...USER_ROLES]);
});

test("passwords are salted PBKDF2 hashes that verify only the original", async () => {
  const first = await hashPassword("Anatomia2026");
  const second = await hashPassword("Anatomia2026");
  assert.notEqual(first, second);
  assert.match(first, /^pbkdf2-sha256\$100000\$/);
  assert.equal(await verifyPassword("Anatomia2026", first), true);
  assert.equal(await verifyPassword("anatomia2026", first), false);
  assert.equal(await verifyPassword("Anatomia2026", "garbage"), false);
});

test("register → session → login → logout lifecycle", async () => {
  const db = await freshDb();
  const registered = await registerUser(db, ana, 1_000);
  assert.ok(registered.ok);
  assert.equal(registered.user.plan, "free");
  assert.equal(registered.expiresAt, 1_000 + SESSION_TTL_MS);

  const duplicate = await registerUser(db, ana);
  assert.deepEqual(duplicate, { ok: false, reason: "email_taken" });

  const stored = await db.select().from(sessions).all();
  assert.equal(stored.length, 1);
  assert.notEqual(stored[0].id, registered.token, "plaintext token must never be stored");

  assert.equal((await getUserBySessionToken(db, registered.token, 2_000))?.email, ana.email);
  assert.equal(await getUserBySessionToken(db, registered.token, 1_000 + SESSION_TTL_MS + 1), null, "expired");
  assert.equal(await getUserBySessionToken(db, "forged-token"), null);

  const wrong = await loginUser(db, { email: ana.email, password: "nope-nope-1" });
  assert.deepEqual(wrong, { ok: false, reason: "invalid_credentials" });
  const unknown = await loginUser(db, { email: "nadie@x.mx", password: ana.password });
  assert.deepEqual(unknown, { ok: false, reason: "invalid_credentials" });

  const login = await loginUser(db, { email: ana.email, password: ana.password });
  assert.ok(login.ok);
  await revokeSession(db, login.token);
  assert.equal(await getUserBySessionToken(db, login.token), null);
});

test("login is rate limited per email within the window", async () => {
  const db = await freshDb();
  await registerUser(db, ana);
  const now = 50_000;
  for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) {
    const attempt = await loginUser(db, { email: ana.email, password: "wrong-pass-1" }, now);
    assert.equal(attempt.ok, false);
  }
  const blocked = await loginUser(db, { email: ana.email, password: ana.password }, now + 1);
  assert.equal(blocked.ok, false);
  assert.equal(!blocked.ok && blocked.reason, "rate_limited");

  const later = await loginUser(db, { email: ana.email, password: ana.password }, now + LOGIN_WINDOW_MS + 1);
  assert.ok(later.ok, "window expiry lifts the block");
});

test("plan updates persist on the user", async () => {
  const db = await freshDb();
  const registered = await registerUser(db, ana);
  assert.ok(registered.ok);
  await updateUserPlan(db, registered.user.id, "pro");
  assert.equal((await getUserBySessionToken(db, registered.token))?.plan, "pro");
});

test("study events dedupe views and aggregate mastery", async () => {
  const db = await freshDb();
  const registered = await registerUser(db, ana);
  assert.ok(registered.ok);
  const userId = registered.user.id;
  const t0 = Date.UTC(2026, 9, 7, 18);

  assert.equal(await recordStudyEvent(db, userId, { organId: "heart", kind: "view" }, t0), true);
  assert.equal(await recordStudyEvent(db, userId, { organId: "heart", kind: "view" }, t0 + 1000), false);
  assert.equal(await recordStudyEvent(db, userId, { organId: "heart", kind: "view" }, t0 + VIEW_DEDUPE_MS + 1), true);
  await recordStudyEvent(db, userId, { organId: "heart", kind: "tour" }, t0 + 2000);
  await recordStudyEvent(db, userId, { organId: "heart", kind: "quiz", correct: true }, t0 + 3000);
  await recordStudyEvent(db, userId, { organId: "lungs", kind: "quiz", correct: false }, t0 + 4000);

  const stats = await getDashboardStats(db, userId, t0 + VIEW_DEDUPE_MS + 5000);
  const heart = stats.organs.find((organ) => organ.organId === "heart")!;
  assert.equal(heart.views, 2);
  assert.equal(heart.mastery, 100);
  assert.equal(stats.organsStudied, 2);
  assert.equal(stats.quizAccuracy, 50);
  assert.equal(stats.toursCompleted, 1);
  assert.equal(stats.streakDays, 1);
  assert.equal(stats.activity.at(-1)?.count, 5, "the deduped view is not counted");
  assert.equal(stats.recent[0].organId, "heart", "newest event first");
});

test("streak counts consecutive days ending today or yesterday", () => {
  assert.equal(computeStreak(new Set(["2026-10-05", "2026-10-06", "2026-10-07"]), "2026-10-07"), 3);
  assert.equal(computeStreak(new Set(["2026-10-05", "2026-10-06"]), "2026-10-07"), 2);
  assert.equal(computeStreak(new Set(["2026-10-04"]), "2026-10-07"), 0);
  assert.equal(aggregateStats([], Date.now()).quizAccuracy, null);
});

test("registration validation and redirect sanitising", () => {
  const ok = validateRegistration({ ...ana, email: "  ANA@Hospital.MX ", terms: true });
  assert.ok(ok.ok);
  assert.equal(ok.data.email, "ana@hospital.mx");

  const bad = validateRegistration({ name: "A", email: "x", password: "short", role: "admin", terms: false });
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys(!bad.ok ? bad.errors : {}).sort(), ["email", "name", "password", "role", "terms"]);

  assert.equal(safeRedirectPath("/atlas?organ=heart"), "/atlas?organ=heart");
  for (const evil of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", null]) {
    assert.equal(safeRedirectPath(evil), "/dashboard");
  }
});
