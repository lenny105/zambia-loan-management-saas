import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReceiptJob = {
  job_id: string;
  invoice_id: string;
  tenant_id: string;
  tenant_legal_name: string;
  invoice_number: string;
  plan_name: string;
  billing_period: string;
  amount_minor: number;
  currency: string;
  paid_at: string;
  lenco_reference: string;
  recipient: string;
};

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

async function makeReceipt(job: ReceiptJob) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.06, 0.25, 0.21);
  const muted = rgb(0.38, 0.45, 0.43);
  const money = new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW" }).format(
    job.amount_minor / 100,
  );
  const receiptNumber = `RCP-${job.invoice_number.replace(/^INV-/, "")}`;
  const paidDate = new Date(job.paid_at).toLocaleDateString("en-ZM", { timeZone: "Africa/Lusaka" });

  page.drawRectangle({ x: 0, y: 742, width: 595.28, height: 100, color: green });
  page.drawText("EZER-X", { x: 48, y: 790, size: 25, font: bold, color: rgb(1, 1, 1) });
  page.drawText("SUBSCRIPTION PAYMENT RECEIPT", {
    x: 48,
    y: 765,
    size: 10,
    font: regular,
    color: rgb(0.78, 0.9, 0.86),
  });
  page.drawText("Receipt", { x: 48, y: 690, size: 30, font: bold, color: green });
  page.drawText(receiptNumber, { x: 48, y: 662, size: 12, font: regular, color: muted });
  page.drawText("Received from", { x: 48, y: 610, size: 10, font: regular, color: muted });
  page.drawText(job.tenant_legal_name.slice(0, 70), { x: 48, y: 588, size: 16, font: bold, color: green });
  page.drawText("Plan", { x: 48, y: 536, size: 10, font: regular, color: muted });
  page.drawText(`${job.plan_name} - ${job.billing_period}`, { x: 48, y: 514, size: 13, font: bold, color: green });
  page.drawText("Invoice", { x: 340, y: 536, size: 10, font: regular, color: muted });
  page.drawText(job.invoice_number, { x: 340, y: 514, size: 12, font: bold, color: green });
  page.drawLine({ start: { x: 48, y: 475 }, end: { x: 547, y: 475 }, thickness: 1, color: rgb(0.84, 0.88, 0.87) });
  page.drawText("Amount paid", { x: 48, y: 430, size: 11, font: regular, color: muted });
  page.drawText(money, { x: 48, y: 392, size: 28, font: bold, color: green });
  page.drawText("Payment date", { x: 340, y: 430, size: 10, font: regular, color: muted });
  page.drawText(paidDate, { x: 340, y: 408, size: 12, font: bold, color: green });
  page.drawText("Lenco reference", { x: 340, y: 370, size: 10, font: regular, color: muted });
  page.drawText(job.lenco_reference.slice(0, 32), { x: 340, y: 348, size: 10, font: regular, color: green });
  page.drawText("Status: PAID", { x: 48, y: 318, size: 12, font: bold, color: rgb(0.05, 0.55, 0.35) });
  page.drawText("This receipt confirms payment for an EZER-X SaaS subscription.", {
    x: 48,
    y: 108,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText("Support: operations@ezer-x.com", { x: 48, y: 88, size: 9, font: regular, color: muted });
  page.drawText("Document integrity is protected by the SHA-256 hash stored with this receipt.", {
    x: 48,
    y: 68,
    size: 8,
    font: regular,
    color: muted,
  });
  return pdf.save();
}

Deno.serve(async (request: Request) => {
  if (request.headers.get("x-cron-secret") !== required("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  let completed = 0;

  for (let iteration = 0; iteration < 10; iteration++) {
    const { data, error } = await supabase.rpc("claim_subscription_receipt_job");
    if (error) throw error;
    const job = (data?.[0] ?? null) as ReceiptJob | null;
    if (!job) break;

    try {
      let bytes = await makeReceipt(job);
      const path = `${job.tenant_id}/receipts/${job.invoice_id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("platform-billing")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        if (!uploadError.message.toLowerCase().includes("already exists")) throw uploadError;
        const { data: existing, error: downloadError } = await supabase.storage
          .from("platform-billing")
          .download(path);
        if (downloadError) throw downloadError;
        bytes = new Uint8Array(await existing.arrayBuffer());
      }
      const hash = hex(await crypto.subtle.digest("SHA-256", bytes));

      const { error: completeError } = await supabase.rpc("complete_subscription_receipt_job", {
        target_job_id: job.job_id,
        target_invoice_id: job.invoice_id,
        target_document_path: path,
        target_document_hash: hash,
      });
      if (completeError) throw completeError;
      completed++;
    } catch (error) {
      await supabase.rpc("fail_subscription_receipt_job", {
        target_job_id: job.job_id,
        safe_error: error instanceof Error ? error.message : "Receipt generation failed",
      });
    }
  }

  return Response.json({ completed });
});
