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
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function render(job: OutboxJob) {
  const templates: Record<
    string,
    { heading: string; body: string; destination: string; footer: string }
  > = {
    subscription_receipt: {
      heading: "Your subscription receipt is ready",
      body: "Your ZamLoan platform billing receipt has been created.",
      destination: "Sign in to your secure lender workspace to download it.",
      footer: "This message concerns your EZER-X SaaS subscription only.",
    },
    subscription_invoice: {
      heading: "Your subscription invoice is ready",
      body: "Your ZamLoan platform subscription invoice has been created.",
      destination: "Sign in to your secure lender workspace to review it.",
      footer: "This message concerns your EZER-X SaaS subscription only.",
    },
    borrower_repayment_receipt: {
      heading: "Your repayment was recorded",
      body: "Your lender recorded a repayment and issued a receipt reference.",
      destination:
        "Sign in to your borrower portal to review the payment and updated statement.",
      footer:
        "Your lender owns this loan and repayment relationship. EZER-X provides software only.",
    },
    borrower_complaint_opened: {
      heading: "New borrower complaint",
      body: "A borrower submitted a complaint requiring acknowledgement and handling.",
      destination: "Sign in to the lender workspace to review it.",
      footer:
        "Handle complaints under your organisation's approved complaints procedure.",
    },
    borrower_complaint_updated: {
      heading: "Your complaint status changed",
      body: `Your lender updated the complaint status to ${escapeHtml(String(job.payload.status ?? "updated"))}.`,
      destination:
        "Sign in to your borrower portal to review the current status.",
      footer: "Contact the lender directly if you require further information.",
    },
    tenant_staff_invitation: {
      heading: "You have been invited to a ZamLoan workspace",
      body: "A verified lender invited you to join its team with a controlled staff role.",
      destination: "Use the secure invitation button below. The invitation expires after seven days and only works for this email address.",
      footer: "Only accept invitations from organisations you recognise.",
    },
  };
  const template = templates[job.message_type] ?? {
    heading: "ZamLoan notification",
    body: "A record in your ZamLoan workspace was updated.",
    destination: "Sign in securely to review it.",
    footer: "EZER-X provides the ZamLoan software platform.",
  };
  const reference = String(
    job.payload.reference ??
      job.payload.receiptId ??
      job.payload.invoiceId ??
      "",
  );
  const actionUrl = typeof job.payload.inviteUrl === "string" ? job.payload.inviteUrl : "";
  const action = actionUrl ? `<p style="margin:24px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#123f35;color:white;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:bold">Review invitation</a></p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f8f7;font-family:Arial,sans-serif;color:#102a24"><div style="max-width:600px;margin:0 auto;padding:32px 20px"><div style="background:#103f35;color:white;padding:24px;border-radius:16px 16px 0 0"><strong style="font-size:24px">ZamLoan</strong></div><div style="background:white;padding:32px;border-radius:0 0 16px 16px"><h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(template.heading)}</h1><p>${template.body}</p><p style="color:#64746f">Reference: ${escapeHtml(reference)}</p><p>${template.destination}</p>${action}<p style="margin-top:32px;font-size:13px;color:#64746f">${template.footer}</p></div></div></body></html>`;
}

Deno.serve(async (request: Request) => {
  if (request.headers.get("x-cron-secret") !== required("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false },
    },
  );
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
        body: JSON.stringify({
          from: required("EMAIL_FROM"),
          to: [job.recipient],
          subject: job.subject,
          html: render(job),
        }),
      });
      const result = (await response.json()) as {
        id?: string;
        message?: string;
      };
      if (!response.ok || !result.id) {
        await supabase.rpc("fail_email_outbox", {
          target_outbox_id: job.outbox_id,
          safe_error: result.message ?? `Resend HTTP ${response.status}`,
          retryable: response.status === 429 || response.status >= 500,
        });
        continue;
      }
      const { error: completeError } = await supabase.rpc(
        "complete_email_outbox",
        {
          target_outbox_id: job.outbox_id,
          target_provider_message_id: result.id,
        },
      );
      if (completeError) throw completeError;
      sent++;
    } catch (error) {
      await supabase.rpc("fail_email_outbox", {
        target_outbox_id: job.outbox_id,
        safe_error:
          error instanceof Error ? error.message : "Resend request failed",
        retryable: true,
      });
    }
  }
  return Response.json({ sent });
});
