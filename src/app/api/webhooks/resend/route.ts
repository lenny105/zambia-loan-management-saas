import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { z } from "zod";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

const eventSchema = z.object({
  type: z.string().startsWith("email."),
  data: z.object({ email_id: z.string().min(1) }).passthrough(),
});

export async function POST(request: Request) {
  const eventId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!eventId || !timestamp || !signature || !secret) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  const rawBody = await request.text();
  try {
    const verified = new Webhook(secret).verify(rawBody, {
      "svix-id": eventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
    const event = eventSchema.parse(verified);
    const admin = createAdminClient();
    const { error } = await admin.from("email_webhook_events").insert({
      provider_event_id: eventId,
      provider_message_id: event.data.email_id,
      event_type: event.type,
      payload_hash: createHash("sha256").update(rawBody).digest("hex"),
    });
    if (error && error.code !== "23505") throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    logError("resend.webhook", error, { eventId });
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }
}
