# Resend email outbox

Business transactions enqueue `email_outbox` records with unique idempotency keys. A server-side worker sends through Resend only when configured. API acceptance means sent; signed delivery webhooks move the message to delivered. Bounce, complaint, failure and review-required states remain visible. Never send critical mail directly from page actions.
