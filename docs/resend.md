# Resend email outbox

Business transactions enqueue `email_outbox` records with unique idempotency keys. A server-side worker sends through Resend only when configured. API acceptance means sent; signed delivery webhooks move the message to delivered. Bounce, complaint, failure and review-required states remain visible. Never send critical mail directly from page actions.

The `resend-outbox` Edge Function atomically claims due messages, uses the
outbox idempotency key as Resend's `Idempotency-Key`, retries transient failures
with bounded backoff and routes permanent or exhausted failures to operations
review. Supabase Cron invokes the worker every two minutes.

Configure Resend to POST email events to `/api/webhooks/resend`. The route
verifies the exact raw request with the Svix headers and `RESEND_WEBHOOK_SECRET`
before storing the unique `svix-id`. API acceptance records `sent`; only the
verified delivery event records `delivered`. Bounces, complaints and suppressed
messages become `requires_review` in `/operations/email-delivery`.
