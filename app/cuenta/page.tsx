import type { Metadata } from "next";
import { getDb } from "../../db";
import { AccountPage } from "../components/AccountPage";
import { getI18n } from "../i18n/server";
import { getBillingProvider, getBillingSummary, syncSubscription } from "../lib/server/billing/service";
import { requireCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).m.meta.account, robots: { index: false } };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadAccount(params: Record<string, string | string[] | undefined>) {
  const preapprovalId = first(params.preapproval_id);
  let user = await requireCurrentUser("/cuenta");
  const db = await getDb();
  const provider = getBillingProvider();
  let syncFailed = false;
  // Al volver del checkout se sincroniza de inmediato, sin esperar al webhook.
  if (preapprovalId && provider) {
    try {
      const synced = await syncSubscription(db, provider, preapprovalId, { expectedUserId: user.id });
      if (synced) user = await requireCurrentUser("/cuenta");
    } catch (error) {
      syncFailed = true;
      console.error("[billing] sincronización al regresar del checkout", error);
    }
  }
  const now = Date.now();
  return { user, now, syncFailed, billing: await getBillingSummary(db, user.id, now), paymentsEnabled: Boolean(provider) };
}

export default async function AccountRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [{ user, now, billing, syncFailed, paymentsEnabled }, { locale, m }] = await Promise.all([loadAccount(params), getI18n()]);
  return (
    <AccountPage
      user={user}
      billing={billing}
      now={now}
      notice={first(params.billing) ?? null}
      syncFailed={syncFailed}
      paymentsEnabled={paymentsEnabled}
      locale={locale}
      m={m}
    />
  );
}
