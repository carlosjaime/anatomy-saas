import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../components/AccountForms";
import { AuthLayout } from "../components/AuthLayout";
import { getI18n } from "../i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).m.meta.forgot };
}

export default async function ForgotPasswordPage() {
  const { m } = await getI18n();
  return (
    <AuthLayout m={m} title={m.auth.forgotTitle} subtitle={m.auth.forgotSubtitle} footer={<>{m.auth.remembered} <Link href="/login">{m.auth.signIn}</Link></>}>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
