import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Esquema de cuentas y progreso de estudio.
 *
 * Las marcas de tiempo se guardan en milisegundos (`integer`) para que las
 * comparaciones de expiración y los agregados por día no dependan del formato
 * de fecha de SQLite. El DDL vive en `db/migrations.ts`; la prueba
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
  /** Obsoleto: el plan efectivo se deriva de `subscriptions`. Se conserva por compatibilidad. */
  plan: text("plan").notNull().default("free"),
  createdAt: integer("created_at").notNull(),
  emailVerifiedAt: integer("email_verified_at"),
  /** 1 cuando el usuario ya consumió su prueba gratis (una por cuenta). */
  trialUsed: integer("trial_used").notNull().default(0),
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

/** `placement`: resultado de un órgano en el reto "Arma el cuerpo humano". */
export const STUDY_EVENT_KINDS = ["view", "quiz", "tour", "placement"] as const;
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
    /** Solo para cuestionarios y ubicaciones: 1 correcta, 0 incorrecta. */
    correct: integer("correct"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("study_events_user_time_idx").on(table.userId, table.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type StudyEventRow = typeof studyEvents.$inferSelect;

export const SUBSCRIPTION_STATUSES = ["pending", "authorized", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const BILLING_CYCLES = ["monthly", "annual"] as const;
export const BILLING_PROVIDERS = ["paypal", "demo", "mercadopago"] as const;
export type BillingProviderName = (typeof BILLING_PROVIDERS)[number];

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    /** Identificador del proveedor (suscripción de PayPal `I-…` o `demo_…`). */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `mercadopago` solo en filas heredadas: ya no se crean ni se sincronizan. */
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    plan: text("plan").notNull(),
    cycle: text("cycle", { enum: BILLING_CYCLES }).notNull(),
    status: text("status", { enum: SUBSCRIPTION_STATUSES }).notNull(),
    /** Monto por periodo en MXN. */
    amount: integer("amount").notNull(),
    trialEndsAt: integer("trial_ends_at"),
    nextPaymentAt: integer("next_payment_at"),
    /** Para suscripciones canceladas: acceso hasta el fin del periodo pagado. */
    accessUntil: integer("access_until"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("subscriptions_user_idx").on(table.userId)],
);

export const EMAIL_TOKEN_PURPOSES = ["verify", "reset"] as const;
export type EmailTokenPurpose = (typeof EMAIL_TOKEN_PURPOSES)[number];

export const emailTokens = sqliteTable(
  "email_tokens",
  {
    /** SHA-256 del token enviado por correo. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose", { enum: EMAIL_TOKEN_PURPOSES }).notNull(),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("email_tokens_user_idx").on(table.userId, table.purpose)],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;

export const TRANSACTION_KINDS = ["payment", "refund", "reversal"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

/**
 * Cobros, reembolsos y reversos reportados por el procesador. Solo referencias
 * e importes: nunca datos de tarjeta ni del medio de pago.
 */
export const billingTransactions = sqliteTable(
  "billing_transactions",
  {
    /** Id de la transacción en el procesador (venta, reembolso o reverso). */
    id: text("id").primaryKey(),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    subscriptionId: text("subscription_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: TRANSACTION_KINDS }).notNull(),
    status: text("status").notNull(),
    /** Importe en centavos (positivo; el tipo indica el sentido). */
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    /** 1 si importe o moneda no coinciden con el plan de la suscripción. */
    flagged: integer("flagged").notNull().default(0),
    relatedId: text("related_id"),
    occurredAt: integer("occurred_at").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("billing_transactions_user_time_idx").on(table.userId, table.occurredAt),
    index("billing_transactions_subscription_idx").on(table.subscriptionId),
  ],
);

export const WEBHOOK_EVENT_STATUSES = ["received", "processed", "ignored", "failed"] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

/** Registro de eventos de webhook para idempotencia y auditoría. */
export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    /** Id del evento en el procesador (`WH-…`). */
    id: text("id").primaryKey(),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    eventType: text("event_type").notNull(),
    resourceId: text("resource_id"),
    status: text("status", { enum: WEBHOOK_EVENT_STATUSES }).notNull(),
    attempts: integer("attempts").notNull().default(1),
    error: text("error"),
    receivedAt: integer("received_at").notNull(),
    processedAt: integer("processed_at"),
  },
  (table) => [index("webhook_events_resource_idx").on(table.resourceId)],
);

export type BillingTransactionRow = typeof billingTransactions.$inferSelect;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
