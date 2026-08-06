# Lenco subscription billing

Lenco is restricted to EZER-X SaaS subscriptions. The route reads the exact raw body, derives the hash key using SHA-256 of the API token, verifies HMAC-SHA512 with constant-time comparison and rejects invalid signatures. Payment activation must occur in a locked database transaction after amount, ZMW currency, tenant, invoice, plan, reference and successful provider status are re-verified. Pending and pay-offline states do not activate access. Poll non-terminal collections every 30 minutes.
