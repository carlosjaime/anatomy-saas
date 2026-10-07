import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "../../../db";
import { emailTokens, type EmailTokenPurpose } from "../../../db/schema";
import { randomToken, sha256Hex } from "./crypto";

/** Vigencia de cada tipo de enlace enviado por correo. */
export const EMAIL_TOKEN_TTL_MS: Record<EmailTokenPurpose, number> = {
  verify: 48 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

/**
 * Emite un token de un solo uso. Invalida los anteriores del mismo propósito
 * para que solo el enlace más reciente funcione. Solo se guarda su SHA-256.
 */
export async function issueEmailToken(db: Database, userId: string, purpose: EmailTokenPurpose, now = Date.now()): Promise<string> {
  await db
    .update(emailTokens)
    .set({ usedAt: now })
    .where(and(eq(emailTokens.userId, userId), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt)));
  const token = randomToken(32);
  await db.insert(emailTokens).values({
    id: await sha256Hex(token),
    userId,
    purpose,
    expiresAt: now + EMAIL_TOKEN_TTL_MS[purpose],
    createdAt: now,
  });
  return token;
}

/**
 * Consume un token: devuelve el usuario si es válido, vigente, del propósito
 * correcto y no usado. La actualización condicional evita el doble uso aun
 * con peticiones concurrentes.
 */
export async function consumeEmailToken(db: Database, token: string, purpose: EmailTokenPurpose, now = Date.now()): Promise<string | null> {
  if (!token || token.length > 128) return null;
  const id = await sha256Hex(token);
  const claimed = await db
    .update(emailTokens)
    .set({ usedAt: now })
    .where(and(eq(emailTokens.id, id), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, now)))
    .returning({ userId: emailTokens.userId });
  return claimed[0]?.userId ?? null;
}
