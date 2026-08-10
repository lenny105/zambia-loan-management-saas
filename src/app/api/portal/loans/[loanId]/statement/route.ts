import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { statementPdf } from "@/lib/pdf/loan-documents";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ loanId: string }> },
) {
  const user = await requireUser(),
    id = z.uuid().safeParse((await params).loanId);
  if (!id.success) return new NextResponse("Not found", { status: 404 });
  const a = createAdminClient();
  const { data: x, error } = await a
    .from("loans")
    .select(
      "id,tenant_id,account_number,principal_minor,status,borrowers(first_name,last_name,profile_id),tenants(legal_name,trading_name),loan_instalments!instalments_loan_tenant_fk(principal_minor,interest_minor,fees_minor,paid_minor),loan_repayments!repayments_loan_tenant_fk(amount_minor,external_reference,received_at,reversed_at)",
    )
    .eq("id", id.data)
    .maybeSingle();
  if (error || !x) return new NextResponse("Not found", { status: 404 });
  const b = Array.isArray(x.borrowers) ? x.borrowers[0] : x.borrowers,
    t = Array.isArray(x.tenants) ? x.tenants[0] : x.tenants;
  if (b?.profile_id !== user.id)
    return new NextResponse("Not found", { status: 404 });
  const asOf = new Date().toISOString().slice(0, 10),
    outstanding = x.loan_instalments.reduce(
      (s, i) =>
        s + i.principal_minor + i.interest_minor + i.fees_minor - i.paid_minor,
      0,
    ),
    payments = x.loan_repayments
      .filter((r) => !r.reversed_at)
      .map((r) => ({
        date: new Date(r.received_at).toLocaleDateString("en-ZM"),
        amount: r.amount_minor,
        reference: r.external_reference,
      }));
  const bytes = await statementPdf({
      lender: t?.trading_name || t?.legal_name || "Lender",
      borrower: `${b.first_name} ${b.last_name}`,
      account: x.account_number,
      status: x.status,
      principal: x.principal_minor,
      outstanding,
      asOf,
      payments,
    }),
    hash = createHash("sha256").update(bytes).digest("hex"),
    path = `${x.tenant_id}/statements/${x.id}/${asOf}-${hash.slice(0, 12)}.pdf`;
  const { error: up } = await a.storage
    .from("borrower-documents")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (up && up.message !== "The resource already exists") throw up;
  await a
    .from("loan_statement_exports")
    .upsert(
      {
        tenant_id: x.tenant_id,
        loan_id: x.id,
        as_of_date: asOf,
        storage_path: path,
        document_hash: hash,
        generated_by: user.id,
      },
      { onConflict: "loan_id,as_of_date,document_hash" },
    );
  await a
    .from("audit_events")
    .insert({
      tenant_id: x.tenant_id,
      actor_profile_id: user.id,
      entity_type: "loan_statement",
      entity_id: x.id,
      action: "loan.statement_generated",
      metadata: { asOf, documentHash: hash },
    });
  const { data: signed } = await a.storage
    .from("borrower-documents")
    .createSignedUrl(path, 120, { download: true });
  return signed
    ? NextResponse.redirect(signed.signedUrl)
    : new NextResponse("Unavailable", { status: 503 });
}
