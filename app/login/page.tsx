import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "../components/AuthForm";
import { AuthLayout } from "../components/AuthLayout";
import { getCurrentUser } from "../lib/server/session";
import { safeRedirectPath } from "../lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Iniciar sesión — Atlas Anatómico" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).next;
  const next = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión para continuar con tu plan de estudio."
      footer={<>¿No tienes cuenta? <Link href={`/registro?next=${encodeURIComponent(next)}`}>Crea una gratis</Link></>}
    >
      <AuthForm mode="login" next={next} />
    </AuthLayout>
  );
}
