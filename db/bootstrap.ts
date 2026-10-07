/**
 * DDL idempotente que se aplica una vez por proceso/isolate antes de la
 * primera consulta. Evita depender de leer archivos de migración del disco,
 * algo que no es portable entre Vercel (serverless) y Cloudflare Workers.
 *
 * Mantener sincronizado con `db/schema.ts` (lo valida la suite de pruebas).
 */
export const BOOTSTRAP_STATEMENTS: readonly string[] = [
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
];
