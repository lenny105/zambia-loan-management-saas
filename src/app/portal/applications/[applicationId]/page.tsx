import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinorToZmw } from "@/lib/domain/billing";
import {
  EmploymentForm,
  IncomeForm,
  EvidenceUpload,
  SubmitApplication,
} from "@/components/borrower-evidence-forms";
import { acceptAgreement } from "@/app/portal/applications/actions";
export default async function Application({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const user = await requireUser(),
    id = (await params).applicationId;
  const { data: r, error } = await createAdminClient()
    .from("loan_applications")
    .select(
      "id,status,requested_amount_minor,requested_term_months,purpose,applicant_category,loan_products!applications_product_tenant_fk(name,required_payslip_months,required_statement_months),tenants(legal_name,trading_name),borrowers!applications_borrower_tenant_fk(profile_id),application_documents!documents_application_identity_fk(id,document_type,period_month,review_status),loan_agreements!agreements_application_tenant_fk(id,principal_minor,total_interest_minor,total_fees_minor,term_months,content_hash,accepted_at),loans!loans_application_identity_fk(id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !r) notFound();
  const borrower = Array.isArray(r.borrowers) ? r.borrowers[0] : r.borrowers;
  if (borrower?.profile_id !== user.id) notFound();
  const product = Array.isArray(r.loan_products)
      ? r.loan_products[0]
      : r.loan_products,
    tenant = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants,
    agreement = r.loan_agreements[0],
    loan = r.loans[0],
    editable = ["draft", "needs_information"].includes(r.status);
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm font-semibold text-[#16745f]">
        {tenant?.trading_name || tenant?.legal_name}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{product?.name}</h1>
      <p className="mt-3 capitalize text-[#64746f]">
        Status: {r.status.replaceAll("_", " ")}
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Request</h2>
          <p className="mt-4">
            {formatMinorToZmw(r.requested_amount_minor)} over{" "}
            {r.requested_term_months} months
          </p>
          <p className="mt-2 text-sm text-[#64746f]">{r.purpose}</p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Evidence</h2>
          <p className="mt-3 text-sm">
            Required: {product?.required_payslip_months ?? 0} payslip and{" "}
            {product?.required_statement_months ?? 0} statement months.
          </p>
          {r.application_documents.map((d) => (
            <p key={d.id} className="mt-2 text-xs capitalize text-[#64746f]">
              {d.document_type.replaceAll("_", " ")}{" "}
              {d.period_month?.slice(0, 7)} · {d.review_status}
            </p>
          ))}
        </section>
      </div>
      {agreement && (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Loan agreement</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <p>
              Principal
              <br />
              <strong>{formatMinorToZmw(agreement.principal_minor)}</strong>
            </p>
            <p>
              Simple interest
              <br />
              <strong>
                {formatMinorToZmw(agreement.total_interest_minor)}
              </strong>
            </p>
            <p>
              Fees
              <br />
              <strong>{formatMinorToZmw(agreement.total_fees_minor)}</strong>
            </p>
            <p>
              Term
              <br />
              <strong>{agreement.term_months} months</strong>
            </p>
          </div>
          <p className="mt-4 break-all text-xs text-[#64746f]">
            Terms hash: {agreement.content_hash}
          </p>
          {agreement.accepted_at ? (
            <p className="mt-4 text-sm text-emerald-700">Agreement accepted.</p>
          ) : (
            <form action={acceptAgreement} className="mt-5">
              <input type="hidden" name="agreementId" value={agreement.id} />
              <input type="hidden" name="applicationId" value={r.id} />
              <label className="flex gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acceptance"
                  value="accepted"
                  required
                />
                I reviewed and accept these lender-provided terms.
              </label>
              <button className="mt-4 rounded-lg bg-emerald-800 px-5 py-3 text-white">
                Accept agreement
              </button>
            </form>
          )}
          {loan && (
            <Link
              href={`/portal/loans/${loan.id}`}
              className="mt-4 block font-semibold text-[#16745f]"
            >
              View loan statement →
            </Link>
          )}
        </section>
      )}
      {editable && (
        <div className="mt-6 space-y-5">
          {r.applicant_category === "employed" && (
            <EmploymentForm applicationId={r.id} />
          )}
          <IncomeForm applicationId={r.id} />
          <EvidenceUpload applicationId={r.id} />
          <SubmitApplication applicationId={r.id} />
        </div>
      )}
    </main>
  );
}
