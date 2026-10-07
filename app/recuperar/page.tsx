import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../components/AccountForms";
import { AuthLayout } from "../components/AuthLayout";

export const metadata: Metadata = { title: "Recuperar contraseña — Atlas Anatómico" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Recupera tu acceso"
      subtitle="Te enviaremos un enlace para crear una nueva contraseña."
      footer={<>¿La recordaste? <Link href="/login">Inicia sesión</Link></>}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
