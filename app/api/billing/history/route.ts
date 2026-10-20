import { listTransactions } from "../../../lib/server/billing/service";
import { handle, json, requireUser } from "../../../lib/server/http";

/** Historial de cobros, reembolsos y reversos del usuario en sesión. */
export const GET = handle(async (request, m) => {
  const { db, user } = await requireUser(request, m);
  const rows = await listTransactions(db, user.id);
  return json({
    transactions: rows.map((row) => ({
      id: row.id,
      subscriptionId: row.subscriptionId,
      kind: row.kind,
      status: row.status,
      amountCents: row.amountCents,
      currency: row.currency,
      occurredAt: row.occurredAt,
    })),
  });
});
