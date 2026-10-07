import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Esquema de cuentas y progreso de estudio.
 *
 * Las marcas de tiempo se guardan en milisegundos (`integer`) para que las
 * comparaciones de expiración y los agregados por día no dependan del formato
 * de fecha de SQLite. El DDL equivalente vive en `db/bootstrap.ts`; la prueba
 * `tests/auth-store.test.ts` verifica que ambos coincidan.
 */

export const USER_ROLES = ["estudiante", "interno", "residente", "medico", "docente", "otro"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: USER_ROLES }).notNull(),
  institution: text("institution"),
  plan: text("plan").notNull().default("free"),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 del token de la cookie; el token en claro nunca se guarda. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

/** Ventana deslizante de intentos para limitar fuerza bruta en el login. */
export const authAttempts = sqliteTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: integer("window_start").notNull(),
});

export const STUDY_EVENT_KINDS = ["view", "quiz", "tour"] as const;
export type StudyEventKind = (typeof STUDY_EVENT_KINDS)[number];

export const studyEvents = sqliteTable(
  "study_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organId: text("organ_id").notNull(),
    kind: text("kind", { enum: STUDY_EVENT_KINDS }).notNull(),
    /** Solo para cuestionarios: 1 correcta, 0 incorrecta. */
    correct: integer("correct"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("study_events_user_time_idx").on(table.userId, table.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type StudyEventRow = typeof studyEvents.$inferSelect;
