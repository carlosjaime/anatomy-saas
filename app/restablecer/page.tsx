import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "../components/AccountForms";
import { AuthLayout } from "../components/AuthLayout";
import { getI18n } from "../i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).m.meta.reset, robots: { index: false } };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const { m } = await getI18n();
  return (
    <AuthLayout m={m} title={m.auth.resetTitle} subtitle={m.auth.resetSubtitle} footer={<Link href="/login">{m.auth.backToLogin}</Link>}>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="form-alert" role="alert">{m.auth.incompleteLink} <Link href="/recuperar">{m.auth.requestNew}</Link>.</p>
      )}
    </AuthLayout>
  );
}
