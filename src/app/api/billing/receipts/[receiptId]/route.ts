import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getOnboarding } from "@/lib/onboarding";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ receiptId: string }> }) {
  const user = await requireUser();
  const current = await getOnboarding(user.id);
  const parsed = z.uuid().safeParse((await params).receiptId);
  if (!current || !parsed.success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const admin = createAdminClient();
    const { data: receipt, error } = await admin
      .from("subscription_receipts")
      .select("tenant_id,document_path")
      .eq("id", parsed.data)
      .eq("tenant_id", current.tenantId)
      .single();
    if (error || !receipt?.document_path) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("platform-billing")
      .createSignedUrl(receipt.document_path, 120, { download: true });
    if (signedError) throw signedError;
    await admin.from("audit_events").insert({
      tenant_id: receipt.tenant_id,
      actor_profile_id: user.id,
      entity_type: "subscription_receipt",
      entity_id: parsed.data,
      action: "subscription_receipt.downloaded",
      metadata: { expiresInSeconds: 120 },
    });
    return NextResponse.redirect(signed.signedUrl, 303);
  } catch (error) {
    const correlationId = logError("billing.receipt_download", error, { receiptId: parsed.data });
    return NextResponse.json({ error: "Receipt unavailable", correlationId }, { status: 503 });
  }
}
