import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
export default async function Loan({
  params,
}: {
  params: Promise<{ loanId: string }>;
}) {
  const user = await requireUser(),
    id = (await params).loanId;
  const { data: x, error } = await createAdminClient()
    .from("loans")
    .select(
      "id,account_number,principal_minor,status,agreement_id,borrowers(profile_id),tenants(legal_name,trading_name),loan_instalments!instalments_loan_tenant_fk(id,instalment_number,due_date,principal_minor,interest_minor,fees_minor,paid_minor),loan_repayments!repayments_loan_tenant_fk(id,amount_minor,external_reference,received_at,reversed_at,loan_repayment_receipts!loan_receipts_repayment_tenant_fk(id,receipt_number))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !x) notFound();
  const b = Array.isArray(x.borrowers) ? x.borrowers[0] : x.borrowers;
  if (b?.profile_id !== user.id) notFound();
  const t = Array.isArray(x.tenants) ? x.tenants[0] : x.tenants,
    outstanding = x.loan_instalments.reduce(
      (s, i) =>
        s + i.principal_minor + i.interest_minor + i.fees_minor - i.paid_minor,
      0,
    );
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm font-semibold text-[#16745f]">
        {t?.trading_name || t?.legal_name}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{x.account_number}</h1>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`/api/portal/agreements/${x.agreement_id}`}
          className="rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Download agreement PDF
        </a>
        <a
          href={`/api/portal/loans/${x.id}/statement`}
          className="rounded-lg bg-[#123f35] px-4 py-2 text-sm font-semibold text-white"
        >
          Download current statement
        </a>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-[#64746f]">
            Outstanding scheduled balance
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatMinorToZmw(outstanding)}
          </p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-[#64746f]">Status</p>
          <p className="mt-3 text-2xl font-semibold capitalize">
            {x.status.replaceAll("_", " ")}
          </p>
        </section>
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <h2 className="p-5 font-semibold">Schedule</h2>
        {x.loan_instalments.map((i) => (
          <div
            key={i.id}
            className="grid gap-2 border-t p-4 text-sm sm:grid-cols-4"
          >
            <span>#{i.instalment_number}</span>
            <span>{i.due_date}</span>
            <span>
              {formatMinorToZmw(
                i.principal_minor + i.interest_minor + i.fees_minor,
              )}
            </span>
            <span>Paid {formatMinorToZmw(i.paid_minor)}</span>
          </div>
        ))}
      </section>
      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <h2 className="p-5 font-semibold">Payment history</h2>
        {!x.loan_repayments.length ? (
          <p className="p-5 text-sm text-[#64746f]">No repayments recorded.</p>
        ) : (
          x.loan_repayments.map((r) => {
            const receipt = r.loan_repayment_receipts[0];
            return (
              <div
                key={r.id}
                className="grid gap-2 border-t p-4 text-sm sm:grid-cols-[140px_1fr_170px]"
              >
                <span>
                  {new Date(r.received_at).toLocaleDateString("en-ZM")}
                </span>
                <span
                  className={r.reversed_at ? "line-through text-rose-700" : ""}
                >
                  {formatMinorToZmw(r.amount_minor)} · {r.external_reference}
                </span>
                {receipt ? (
                  <a
                    href={`/api/portal/receipts/${receipt.id}`}
                    className="font-semibold text-[#16745f]"
                  >
                    Download {receipt.receipt_number}
                  </a>
                ) : (
                  <span />
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
