import type { Metadata } from "next";
import { getDb } from "../../db";
import { AccountPage } from "../components/AccountPage";
import { getI18n } from "../i18n/server";
import { getBillingProvider, getBillingSummary, listTransactions, reconcileSubscription } from "../lib/server/billing/service";
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
  // PayPal vuelve con `subscription_id` (y `ba_token`/`token`, que no se usan).
  const subscriptionId = first(params.subscription_id);
  let user = await requireCurrentUser("/cuenta");
  const db = await getDb();
  const provider = getBillingProvider();
  let syncFailed = false;
  // Al volver del checkout se reconcilia de inmediato, sin esperar al webhook.
  // El redirect no es comprobante: el estado se consulta a PayPal y solo se
  // aplica si la suscripción pertenece al usuario en sesión.
  if (subscriptionId && provider) {
    try {
      const synced = await reconcileSubscription(db, provider, subscriptionId, { expectedUserId: user.id });
      if (synced) user = await requireCurrentUser("/cuenta");
    } catch (error) {
      syncFailed = true;
      console.error("[billing] sincronización al regresar del checkout", error);
    }
  }
  const now = Date.now();
  const [billing, transactions] = await Promise.all([getBillingSummary(db, user.id, now), listTransactions(db, user.id, 24)]);
  return { user, now, syncFailed, billing, transactions, paymentsEnabled: Boolean(provider) };
}

export default async function AccountRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [{ user, now, billing, transactions, syncFailed, paymentsEnabled }, { locale, m }] = await Promise.all([loadAccount(params), getI18n()]);
  return (
    <AccountPage
      user={user}
      billing={billing}
      transactions={transactions}
      now={now}
      notice={first(params.billing) ?? null}
      syncFailed={syncFailed}
      paymentsEnabled={paymentsEnabled}
      locale={locale}
      m={m}
    />
  );
}
