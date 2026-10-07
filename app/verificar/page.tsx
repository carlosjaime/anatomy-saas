import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { DatabaseUnavailableError, getDb } from "../../db";
import { AuthLayout } from "../components/AuthLayout";
import { markEmailVerified } from "../lib/server/auth-store";
import { consumeEmailToken } from "../lib/server/email-tokens";
import { getCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificar correo — Atlas Anatómico", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function verify(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const db = await getDb();
    const userId = await consumeEmailToken(db, token, "verify");
    if (!userId) return false;
    await markEmailVerified(db, userId);
    return true;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return false;
    throw error;
  }
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).token;
  // Un enlace ya usado no es un error si la cuenta abierta ya está verificada
  // (p. ej. al abrirlo dos veces o tras el escaneo de un filtro de correo).
  const verified = (await verify(Array.isArray(raw) ? raw[0] : raw)) || Boolean((await getCurrentUser())?.emailVerified);
  return (
    <AuthLayout
      title={verified ? "¡Correo confirmado!" : "No pudimos confirmar tu correo"}
      subtitle={verified ? "Tu cuenta está lista. Ya puedes suscribirte a cualquier plan." : "El enlace no es válido, ya se usó o expiró."}
      footer={<Link href="/dashboard">Ir a mi panel</Link>}
    >
      <div className="auth-result">
        <span className={`auth-result-icon ${verified ? "" : "error"}`}>{verified ? <CheckCircle2 size={28} /> : <XCircle size={28} />}</span>
        {verified ? (
          <Link className="btn btn-primary btn-lg" href="/atlas?panel=plans">Ver planes</Link>
        ) : (
          <Link className="btn btn-outline btn-lg" href="/cuenta">Reenviar desde mi cuenta</Link>
        )}
      </div>
    </AuthLayout>
  );
}
