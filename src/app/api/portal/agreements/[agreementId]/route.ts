import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { agreementPdf } from "@/lib/pdf/loan-documents";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ agreementId: string }> },
) {
  const user = await requireUser(),
    id = z.uuid().safeParse((await params).agreementId);
  if (!id.success) return new NextResponse("Not found", { status: 404 });
  const a = createAdminClient();
  const { data: x, error } = await a
    .from("loan_agreements")
    .select(
      "id,tenant_id,principal_minor,total_interest_minor,total_fees_minor,term_months,content_hash,accepted_at,storage_path,document_hash,loan_applications!agreements_application_tenant_fk(borrowers!applications_borrower_tenant_fk(first_name,last_name,profile_id),tenants(legal_name,trading_name),loans!loans_application_identity_fk(account_number))",
    )
    .eq("id", id.data)
    .maybeSingle();
  if (error || !x) return new NextResponse("Not found", { status: 404 });
  const app = Array.isArray(x.loan_applications)
      ? x.loan_applications[0]
      : x.loan_applications,
    b =
      app && (Array.isArray(app.borrowers) ? app.borrowers[0] : app.borrowers),
    t = app && (Array.isArray(app.tenants) ? app.tenants[0] : app.tenants),
    loan = app && (Array.isArray(app.loans) ? app.loans[0] : app.loans);
  if (b?.profile_id !== user.id)
    return new NextResponse("Not found", { status: 404 });
  let path = x.storage_path;
  if (!path) {
    const bytes = await agreementPdf({
        lender: t?.trading_name || t?.legal_name || "Lender",
        borrower: `${b.first_name} ${b.last_name}`,
        account: loan?.account_number || "Pending",
        principal: x.principal_minor,
        interest: x.total_interest_minor,
        fees: x.total_fees_minor,
        term: x.term_months,
        hash: x.content_hash,
        acceptedAt: x.accepted_at,
      }),
      hash = createHash("sha256").update(bytes).digest("hex");
    path = `${x.tenant_id}/agreements/${x.id}.pdf`;
    const { error: uploadError } = await a.storage
      .from("borrower-documents")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;
    await a
      .from("loan_agreements")
      .update({ storage_path: path, document_hash: hash })
      .eq("id", x.id)
      .is("storage_path", null);
  }
  const { data: signed, error: signedError } = await a.storage
    .from("borrower-documents")
    .createSignedUrl(path, 120, { download: true });
  if (signedError) return new NextResponse("Unavailable", { status: 503 });
  await a
    .from("audit_events")
    .insert({
      tenant_id: x.tenant_id,
      actor_profile_id: user.id,
      entity_type: "loan_agreement",
      entity_id: x.id,
      action: "agreement.downloaded",
      metadata: {},
    });
  return NextResponse.redirect(signed.signedUrl);
}
