import type { Metadata } from "next";
import { getDb } from "../../db";
import { Dashboard } from "../components/dashboard/Dashboard";
import { getDashboardStats } from "../lib/server/progress-store";
import { requireCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi panel — Atlas Anatómico" };

async function loadDashboard() {
  const user = await requireCurrentUser("/dashboard");
  const now = Date.now();
  return { user, now, stats: await getDashboardStats(await getDb(), user.id, now) };
}

export default async function DashboardPage() {
  const { user, stats, now } = await loadDashboard();
  return <Dashboard user={user} stats={stats} now={now} />;
}
