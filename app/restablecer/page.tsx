import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "../components/AccountForms";
import { AuthLayout } from "../components/AuthLayout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nueva contraseña — Atlas Anatómico", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  return (
    <AuthLayout
      title="Crea una nueva contraseña"
      subtitle="Al guardarla cerraremos tus otras sesiones por seguridad."
      footer={<Link href="/login">Volver a iniciar sesión</Link>}
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="form-alert" role="alert">El enlace está incompleto. <Link href="/recuperar">Solicita uno nuevo</Link>.</p>
      )}
    </AuthLayout>
  );
}
