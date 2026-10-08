import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { DatabaseUnavailableError, getDb } from "../../db";
import { AuthLayout } from "../components/AuthLayout";
import { Confetti } from "../components/ui/Confetti";
import { getI18n } from "../i18n/server";
import { markEmailVerified } from "../lib/server/auth-store";
import { consumeEmailToken } from "../lib/server/email-tokens";
import { getCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).m.meta.verify, robots: { index: false } };
}

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
  const consumed = await verify(Array.isArray(raw) ? raw[0] : raw);
  // Un enlace ya usado no es un error si la cuenta abierta ya está verificada
  // (p. ej. al abrirlo dos veces o tras el escaneo de un filtro de correo).
  const verified = consumed || Boolean((await getCurrentUser())?.emailVerified);
  const { m } = await getI18n();
  const a = m.auth;
  return (
    <AuthLayout
      m={m}
      title={verified ? a.verifiedTitle : a.verifyFailedTitle}
      subtitle={verified ? a.verifiedSubtitle : a.verifyFailedSubtitle}
      footer={<Link href="/dashboard">{a.goToPanel}</Link>}
    >
      {consumed && <Confetti />}
      <div className="auth-result">
        <span className={`auth-result-icon ${verified ? "" : "error"}`}>{verified ? <CheckCircle2 size={28} /> : <XCircle size={28} />}</span>
        {verified ? (
          <Link className="btn btn-primary btn-lg" href="/atlas?panel=plans">{a.viewPlans}</Link>
        ) : (
          <Link className="btn btn-outline btn-lg" href="/cuenta">{a.resendFromAccount}</Link>
        )}
      </div>
    </AuthLayout>
  );
}
