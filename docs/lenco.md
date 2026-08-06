# Lenco subscription billing

Lenco is restricted to EZER-X SaaS subscriptions. The route reads the exact raw body, derives the hash key using SHA-256 of the API token, verifies HMAC-SHA512 with constant-time comparison and rejects invalid signatures. Payment activation must occur in a locked database transaction after amount, ZMW currency, tenant, invoice, plan, reference and successful provider status are re-verified. Pending and pay-offline states do not activate access. Poll non-terminal collections every 30 minutes.

The `lenco-poll` Edge Function re-queries pending and pay-offline collections
older than 30 minutes. Deploy it with server-only `LENCO_API_URL`,
`LENCO_API_TOKEN`, and `CRON_SECRET` secrets, then schedule an authenticated
invocation every 30 minutes with Supabase Cron. Status-query records use
`verification_source=status_query`; they are never mislabelled as signed
webhooks. Configure the public Lenco webhook as `/api/webhooks/lenco` only after
deployment because localhost cannot receive provider events.
