import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
import { RepaymentReversal } from "@/components/repayment-reversal";
export default async function Repayments() {
  const { tenantId } = await requireTenantWorkspace();
  const { data, error } = await createAdminClient()
    .from("loan_repayments")
    .select(
      "id,amount_minor,method,external_reference,received_at,reversed_at,reversal_reason,loans!repayments_loan_tenant_fk(account_number),loan_repayment_receipts!loan_receipts_repayment_tenant_fk(receipt_number)",
    )
    .eq("tenant_id", tenantId)
    .order("received_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (
    <main className="p-6 lg:p-10">
      <p className="text-sm font-semibold text-[#16745f]">
        LENDER-CONTROLLED COLLECTIONS
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Repayments</h1>
      <p className="mt-2 text-[#64746f]">
        Corrections create append-only reversal adjustments; original payment
        records remain visible.
      </p>
      <section className="mt-8 space-y-4">
        {!data.length ? (
          <p className="rounded-2xl bg-white p-10 text-center text-sm text-[#64746f]">
            No repayments recorded.
          </p>
        ) : (
          data.map((x) => {
            const l = Array.isArray(x.loans) ? x.loans[0] : x.loans,
              receipt = x.loan_repayment_receipts[0];
            return (
              <article
                key={x.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="grid gap-2 text-sm md:grid-cols-[1fr_160px_180px]">
                  <div>
                    <p className="font-medium">{l?.account_number}</p>
                    <p className="text-xs text-[#64746f]">
                      {x.external_reference}{" "}
                      {receipt ? `· ${receipt.receipt_number}` : ""}
                    </p>
                  </div>
                  <span>{formatMinorToZmw(x.amount_minor)}</span>
                  <span>
                    {new Date(x.received_at).toLocaleDateString("en-ZM")}
                  </span>
                </div>
                {x.reversed_at ? (
                  <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
                    Reversed: {x.reversal_reason}
                  </p>
                ) : (
                  <RepaymentReversal id={x.id} />
                )}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
