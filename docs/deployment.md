# Deployment and release

Netlify must use `pnpm release:check` and the Node/pnpm versions in source. Configure public and server secrets in the correct scopes; register full HTTPS Auth URLs; deploy migrations and Edge Functions before dependent web code. Roll back application code by reverting forward. Repair applied database changes with a new forward-only migration.

The production application URL is `https://zamloan.ezer-x.com`. Netlify must
set `APP_URL` to that exact origin. Supabase Auth uses it as the site URL and
allows both the production origin and `http://localhost:3000/**` for local
development callbacks.

Provider callbacks:

- Resend: `https://zamloan.ezer-x.com/api/webhooks/resend`
- Lenco: `https://zamloan.ezer-x.com/api/webhooks/lenco`

The Resend signing secret returned when that endpoint is created must be stored
as `RESEND_WEBHOOK_SECRET` in Netlify. Lenco provisions its webhook URL through
provider support; keep the documented 30-minute status poller enabled as the
fallback.

Production status: the Resend endpoint is registered, enabled and signature-
verified against the deployed application. The Lenco setup request was sent to
`support@lenco.co`; activation remains pending their confirmation.
