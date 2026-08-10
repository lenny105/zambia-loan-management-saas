"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantWorkspace } from "@/lib/tenant-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseZmwToMinor } from "@/lib/domain/billing";
import { logError } from "@/lib/logger";

export type ProductState = { ok: boolean; message: string };

const categories = ["employed", "self_employed", "business_owner", "pensioner", "student", "unemployed"] as const;
const schema = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[a-z0-9_-]+$/),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(500),
  minAmount: z.string(), maxAmount: z.string(),
  minTerm: z.coerce.number().int().min(1).max(120),
  maxTerm: z.coerce.number().int().min(1).max(120),
  annualInterest: z.coerce.number().min(0).max(100),
  applicationFee: z.string(),
  payslipMonths: z.coerce.number().int().min(0).max(12),
  statementMonths: z.coerce.number().int().min(0).max(12),
  published: z.boolean(),
});

export async function createLoanProduct(_: ProductState, form: FormData): Promise<ProductState> {
  const parsed = schema.safeParse({
    ...Object.fromEntries(form),
    published: form.get("published") === "on",
  });
  const selected = form.getAll("applicantCategories").filter((value): value is typeof categories[number] => typeof value === "string" && categories.includes(value as typeof categories[number]));
  if (!parsed.success || !selected.length) return { ok: false, message: "Check the product terms and select at least one applicant category." };

  try {
    const { user, tenantId, roleId } = await requireTenantWorkspace();
    const admin = createAdminClient();
    const { data: permission, error: permissionError } = await admin.from("tenant_role_permissions").select("permission").eq("role_id", roleId).eq("permission", "products.manage").maybeSingle();
    if (permissionError) throw permissionError;
    if (!permission) return { ok: false, message: "Your role cannot manage loan products." };

    const minAmount = parseZmwToMinor(parsed.data.minAmount);
    const maxAmount = parseZmwToMinor(parsed.data.maxAmount);
    const applicationFee = parseZmwToMinor(parsed.data.applicationFee);
    if (maxAmount < minAmount || parsed.data.maxTerm < parsed.data.minTerm) return { ok: false, message: "Maximum amount and term must be greater than or equal to the minimum." };

    const { data: product, error } = await admin.from("loan_products").insert({
      tenant_id: tenantId,
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description,
      min_amount_minor: minAmount,
      max_amount_minor: maxAmount,
      min_term_months: parsed.data.minTerm,
      max_term_months: parsed.data.maxTerm,
      annual_interest_rate_bps: Math.round(parsed.data.annualInterest * 100),
      application_fee_minor: applicationFee,
      applicant_categories: selected,
      required_payslip_months: parsed.data.payslipMonths,
      required_statement_months: parsed.data.statementMonths,
      published: parsed.data.published,
      active: true,
      created_by: user.id,
    }).select("id").single();
    if (error) throw error;
    const { error: auditError } = await admin.from("audit_events").insert({ tenant_id: tenantId, actor_profile_id: user.id, entity_type: "loan_product", entity_id: product.id, action: parsed.data.published ? "loan_product.created_and_published" : "loan_product.created", metadata: { code: parsed.data.code, applicantCategories: selected } });
    if (auditError) throw auditError;
    revalidatePath("/workspace/products");
    revalidatePath("/borrow");
    return { ok: true, message: parsed.data.published ? "Product created and published." : "Product saved privately." };
  } catch (error) {
    return { ok: false, message: `Product creation failed. Reference: ${logError("workspace.product.create", error)}` };
  }
}
