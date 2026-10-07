import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DatabaseUnavailableError, getDb } from "../../../db";
import { getUserBySessionToken, type SessionUser } from "./auth-store";
import { SESSION_COOKIE } from "./http";

/**
 * Lectura de la sesión desde Server Components. Si la base de datos no está
 * configurada, la app sigue funcionando como invitado en lugar de romperse.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await getUserBySessionToken(await getDb(), token);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return null;
    throw error;
  }
}

export async function requireCurrentUser(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}
