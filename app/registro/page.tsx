import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "../components/AuthForm";
import { AuthLayout } from "../components/AuthLayout";
import { getI18n } from "../i18n/server";
import { getCurrentUser } from "../lib/server/session";
import { safeRedirectPath } from "../lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).m.meta.register };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).next;
  const next = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);
  if (await getCurrentUser()) redirect(next);
  const { m } = await getI18n();
  return (
    <AuthLayout
      m={m}
      title={m.auth.registerTitle}
      subtitle={m.auth.registerSubtitle}
      footer={<>{m.auth.haveAccount} <Link href={`/login?next=${encodeURIComponent(next)}`}>{m.auth.signIn}</Link></>}
    >
      <AuthForm mode="register" next={next} />
    </AuthLayout>
  );
}
