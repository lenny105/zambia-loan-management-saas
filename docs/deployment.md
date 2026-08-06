# Deployment and release

Netlify must use `pnpm release:check` and the Node/pnpm versions in source. Configure public and server secrets in the correct scopes; register full HTTPS Auth URLs; deploy migrations and Edge Functions before dependent web code. Roll back application code by reverting forward. Repair applied database changes with a new forward-only migration.
