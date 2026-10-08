import type { Metadata } from "next";
import { getDb } from "../../db";
import { Dashboard } from "../components/dashboard/Dashboard";
import { getAtlasContent } from "../content";
import { getI18n } from "../i18n/server";
import { getDashboardStats } from "../lib/server/progress-store";
import { requireCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).m.meta.dashboard, robots: { index: false } };
}

async function loadDashboard() {
  const user = await requireCurrentUser("/dashboard");
  const now = Date.now();
  return { user, now, stats: await getDashboardStats(await getDb(), user.id, now) };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ user, stats, now }, { locale, m }, params] = await Promise.all([loadDashboard(), getI18n(), searchParams]);
  const { organs, guides } = getAtlasContent(locale);
  return (
    <Dashboard
      user={user}
      stats={stats}
      now={now}
      passwordUpdated={params.password === "updated"}
      locale={locale}
      m={m}
      content={{ organs, guides }}
    />
  );
}
