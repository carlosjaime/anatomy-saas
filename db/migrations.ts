/**
 * Migraciones versionadas que se aplican en tiempo de ejecución, una vez por
 * proceso/isolate, sobre cualquier driver (libSQL o D1).
 *
 * Reglas:
 *  - Nunca edites una migración publicada; agrega una nueva versión.
 *  - Cada sentencia debe ser idempotente o tolerable si ya se aplicó: dos
 *    instancias pueden arrancar a la vez y competir por la misma versión.
 */

export type Migration = { version: number; name: string; statements: readonly string[] };

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: "accounts-and-progress",
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        institution TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
      `CREATE TABLE IF NOT EXISTS auth_attempts (
        key TEXT PRIMARY KEY NOT NULL,
        count INTEGER NOT NULL,
        window_start INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS study_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organ_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        correct INTEGER,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS study_events_user_time_idx ON study_events (user_id, created_at)`,
    ],
  },
  {
    version: 2,
    name: "billing-and-email",
    statements: [
      `ALTER TABLE users ADD COLUMN email_verified_at INTEGER`,
      `ALTER TABLE users ADD COLUMN trial_used INTEGER NOT NULL DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        plan TEXT NOT NULL,
        cycle TEXT NOT NULL,
        status TEXT NOT NULL,
        amount INTEGER NOT NULL,
        trial_ends_at INTEGER,
        next_payment_at INTEGER,
        access_until INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id)`,
      `CREATE TABLE IF NOT EXISTS email_tokens (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS email_tokens_user_idx ON email_tokens (user_id, purpose)`,
    ],
  },
];

/** Mínimo común entre libSQL y D1 que necesita el ejecutor. */
export type SqlExecutor = {
  run(sql: string): Promise<void>;
  appliedVersions(): Promise<number[]>;
};

/** Errores que indican que la sentencia ya se había aplicado (carrera entre instancias). */
function isAlreadyApplied(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error).toLowerCase();
  return message.includes("duplicate column") || message.includes("already exists");
}

export async function migrate(executor: SqlExecutor, migrations: readonly Migration[] = MIGRATIONS): Promise<number[]> {
  await executor.run(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)`,
  );
  const applied = new Set(await executor.appliedVersions());
  const ran: number[] = [];
  for (const migration of [...migrations].sort((a, b) => a.version - b.version)) {
    if (applied.has(migration.version)) continue;
    for (const statement of migration.statements) {
      try {
        await executor.run(statement);
      } catch (error) {
        if (!isAlreadyApplied(error)) throw error;
      }
    }
    await executor.run(
      `INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (${migration.version}, ${Date.now()})`,
    );
    ran.push(migration.version);
  }
  return ran;
}
