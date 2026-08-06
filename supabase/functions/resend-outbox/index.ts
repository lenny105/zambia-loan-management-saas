import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type OutboxJob = {
  outbox_id: string;
  recipient: string;
  subject: string;
  message_type: string;
  template_version: number;
  payload: Record<string, unknown>;
  idempotency_key: string;
  attempt_count: number;
};

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function render(job: OutboxJob) {
  const heading = job.message_type === "subscription_receipt" ? "Your subscription receipt is ready" : "Your subscription invoice is ready";
  const reference = String(job.payload.receiptId ?? job.payload.invoiceId ?? "");
  return `<!doctype html><html><body style="margin:0;background:#f6f8f7;font-family:Arial,sans-serif;color:#102a24"><div style="max-width:600px;margin:0 auto;padding:32px 20px"><div style="background:#103f35;color:white;padding:24px;border-radius:16px 16px 0 0"><strong style="font-size:24px">EZER-X</strong></div><div style="background:white;padding:32px;border-radius:0 0 16px 16px"><h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(heading)}</h1><p>Your ZamLoan platform billing document has been created successfully.</p><p style="color:#64746f">Reference: ${escapeHtml(reference)}</p><p>Sign in to your secure lender workspace to review the document.</p><p style="margin-top:32px;font-size:13px;color:#64746f">This message concerns your EZER-X SaaS subscription only. Support: operations@ezer-x.com</p></div></div></body></html>`;
}

Deno.serve(async (request: Request) => {
  if (request.headers.get("x-cron-secret") !== required("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  let sent = 0;

  for (let iteration = 0; iteration < 10; iteration++) {
    const { data, error } = await supabase.rpc("claim_email_outbox");
    if (error) throw error;
    const job = (data?.[0] ?? null) as OutboxJob | null;
    if (!job) break;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${required("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
          "Idempotency-Key": job.idempotency_key,
        },
        body: JSON.stringify({ from: required("EMAIL_FROM"), to: [job.recipient], subject: job.subject, html: render(job) }),
      });
      const result = await response.json() as { id?: string; message?: string };
      if (!response.ok || !result.id) {
        await supabase.rpc("fail_email_outbox", {
          target_outbox_id: job.outbox_id,
          safe_error: result.message ?? `Resend HTTP ${response.status}`,
          retryable: response.status === 429 || response.status >= 500,
        });
        continue;
      }
      const { error: completeError } = await supabase.rpc("complete_email_outbox", {
        target_outbox_id: job.outbox_id,
        target_provider_message_id: result.id,
      });
      if (completeError) throw completeError;
      sent++;
    } catch (error) {
      await supabase.rpc("fail_email_outbox", {
        target_outbox_id: job.outbox_id,
        safe_error: error instanceof Error ? error.message : "Resend request failed",
        retryable: true,
      });
    }
  }
  return Response.json({ sent });
});
