"use server";
import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { parseZmwToMinor } from "@/lib/domain/billing";
import { logError } from "@/lib/logger";
export type EvidenceState = { ok: boolean; message: string };
async function ownedDraft(applicationId: string) {
  const user = await requireUser(),
    admin = createAdminClient();
  const { data, error } = await admin
    .from("loan_applications")
    .select("id,tenant_id,borrower_id,status,borrowers!applications_borrower_tenant_fk(profile_id)")
    .eq("id", applicationId)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Application not found");
  const borrower = Array.isArray(data.borrowers)
    ? data.borrowers[0]
    : data.borrowers;
  if (
    borrower?.profile_id !== user.id ||
    !["draft", "needs_information"].includes(data.status)
  )
    throw new Error("Application is not editable");
  return { user, admin, application: data };
}
export async function saveEmployment(
  _: EvidenceState,
  form: FormData,
): Promise<EvidenceState> {
  const parsed = z
    .object({
      applicationId: z.uuid(),
      employmentType: z.string().min(2),
      employerName: z.string().min(2),
      jobTitle: z.string().min(2),
      startedOn: z.iso.date(),
      gross: z.string(),
      net: z.string(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "Complete all employment fields." };
  try {
    const { admin, application } = await ownedDraft(parsed.data.applicationId);
    const row = {
      tenant_id: application.tenant_id,
      borrower_id: application.borrower_id,
      application_id: application.id,
      employment_type: parsed.data.employmentType,
      employer_name: parsed.data.employerName,
      job_title: parsed.data.jobTitle,
      started_on: parsed.data.startedOn,
      gross_monthly_minor: parseZmwToMinor(parsed.data.gross),
      net_monthly_minor: parseZmwToMinor(parsed.data.net),
    };
    const { error } = await admin
      .from("borrower_employment")
      .upsert(row, { onConflict: "application_id" });
    if (error) throw error;
    revalidatePath(`/portal/applications/${application.id}`);
    return { ok: true, message: "Employment details saved." };
  } catch (error) {
    return {
      ok: false,
      message: `Could not save employment. Reference: ${logError("borrower.employment.save", error)}`,
    };
  }
}
export async function addIncome(
  _: EvidenceState,
  form: FormData,
): Promise<EvidenceState> {
  const parsed = z
    .object({
      applicationId: z.uuid(),
      sourceType: z.string().min(2),
      description: z.string().min(2),
      amount: z.string(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "Complete the income source." };
  try {
    const { admin, application } = await ownedDraft(parsed.data.applicationId);
    const { error } = await admin
      .from("borrower_income_sources")
      .insert({
        tenant_id: application.tenant_id,
        borrower_id: application.borrower_id,
        application_id: application.id,
        source_type: parsed.data.sourceType,
        description: parsed.data.description,
        monthly_amount_minor: parseZmwToMinor(parsed.data.amount),
      });
    if (error) throw error;
    revalidatePath(`/portal/applications/${application.id}`);
    return { ok: true, message: "Income source added." };
  } catch (error) {
    return {
      ok: false,
      message: `Could not add income. Reference: ${logError("borrower.income.add", error)}`,
    };
  }
}
export async function uploadEvidence(
  _: EvidenceState,
  form: FormData,
): Promise<EvidenceState> {
  const parsed = z
    .object({
      applicationId: z.uuid(),
      documentType: z.enum([
        "payslip",
        "bank_statement",
        "mobile_money_statement",
        "employment_letter",
        "business_registration",
        "other_income_evidence",
      ]),
      period: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .or(z.literal("")),
    })
    .safeParse({
      applicationId: form.get("applicationId"),
      documentType: form.get("documentType"),
      period: form.get("period"),
    });
  if (!parsed.success)
    return { ok: false, message: "Choose a valid evidence type and month." };
  const file = form.get("document");
  if (!(file instanceof File) || !file.size)
    return { ok: false, message: "Choose a document." };
  if (file.size > 10 * 1024 * 1024)
    return { ok: false, message: "The file must be 10 MB or smaller." };
  const extensions = new Map([
    ["application/pdf", "pdf"],
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
  ]);
  const ext = extensions.get(file.type);
  if (!ext) return { ok: false, message: "Upload PDF, PNG or JPEG only." };
  try {
    const { user, admin, application } = await ownedDraft(
      parsed.data.applicationId,
    );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === "application/pdf"
        ? new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
        : file.type === "image/png"
          ? bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid)
      return { ok: false, message: "File content does not match its type." };
    const path = `${application.tenant_id}/${application.id}/${randomUUID()}.${ext}`,
      hash = createHash("sha256").update(bytes).digest("hex");
    const { error: storageError } = await admin.storage
      .from("borrower-evidence")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (storageError) throw storageError;
    const needsPeriod = [
      "payslip",
      "bank_statement",
      "mobile_money_statement",
    ].includes(parsed.data.documentType);
    const { error } = await admin
      .from("application_documents")
      .insert({
        tenant_id: application.tenant_id,
        application_id: application.id,
        borrower_id: application.borrower_id,
        document_type: parsed.data.documentType,
        period_month:
          needsPeriod && parsed.data.period ? `${parsed.data.period}-01` : null,
        storage_path: path,
        file_hash: hash,
      });
    if (error) {
      await admin.storage.from("borrower-evidence").remove([path]);
      throw error;
    }
    await admin
      .from("audit_events")
      .insert({
        tenant_id: application.tenant_id,
        actor_profile_id: user.id,
        entity_type: "application_document",
        entity_id: application.id,
        action: "application.evidence_uploaded",
        metadata: {
          documentType: parsed.data.documentType,
          period: parsed.data.period || null,
          fileHash: hash,
        },
      });
    revalidatePath(`/portal/applications/${application.id}`);
    return { ok: true, message: "Evidence uploaded securely." };
  } catch (error) {
    return {
      ok: false,
      message: `Could not upload evidence. Reference: ${logError("borrower.evidence.upload", error)}`,
    };
  }
}
export async function submitApplication(
  _: EvidenceState,
  form: FormData,
): Promise<EvidenceState> {
  const id = z.uuid().safeParse(form.get("applicationId"));
  if (!id.success) return { ok: false, message: "Invalid application." };
  try {
    await ownedDraft(id.data);
    const supabase = await import("@/lib/supabase/server").then((x) =>
      x.createClient(),
    );
    const { error } = await supabase.rpc("submit_loan_application", {
      p_application_id: id.data,
    });
    if (error)
      return {
        ok: false,
        message: error.message.includes("incomplete")
          ? "Required monthly evidence is incomplete."
          : error.message.includes("employment")
            ? "Employment details are required."
            : error.message.includes("income")
              ? "Add at least one income source."
              : "The application could not be submitted.",
      };
    revalidatePath(`/portal/applications/${id.data}`);
    return { ok: true, message: "Application submitted to the lender." };
  } catch (error) {
    return {
      ok: false,
      message: `Could not submit. Reference: ${logError("borrower.application.submit", error)}`,
    };
  }
}
export async function acceptAgreement(form: FormData) {
  const parsed = z
    .object({
      agreementId: z.uuid(),
      applicationId: z.uuid(),
      acceptance: z.literal("accepted"),
    })
    .parse(Object.fromEntries(form));
  const supabase = await import("@/lib/supabase/server").then((x) =>
    x.createClient(),
  );
  const { error } = await supabase.rpc("accept_loan_agreement", {
    p_agreement_id: parsed.agreementId,
  });
  if (error)
    throw new Error(
      `Agreement acceptance failed. Reference: ${logError("borrower.agreement.accept", error)}`,
    );
  revalidatePath(`/portal/applications/${parsed.applicationId}`);
}
