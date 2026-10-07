import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "../components/AuthForm";
import { AuthLayout } from "../components/AuthLayout";
import { getCurrentUser } from "../lib/server/session";
import { safeRedirectPath } from "../lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear cuenta — Atlas Anatómico" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).next;
  const next = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Gratis, sin tarjeta. Guarda tu progreso y obtén tu panel de estudio."
      footer={<>¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`}>Inicia sesión</Link></>}
    >
      <AuthForm mode="register" next={next} />
    </AuthLayout>
  );
}
