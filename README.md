# Zambia Loan Management SaaS

Production-oriented multi-tenant software for verified Zambian lenders. EZER-X supplies software only and does not lend, broker, decide credit, disburse, collect borrower repayments, hold collateral, or earn loan-based fees.

## Local setup

1. Install Node 24 and pnpm 11.17.0.
2. Copy `.env.example` to `.env.local` and supply a dedicated non-production Supabase project.
3. Run `pnpm install`, `pnpm exec supabase start`, and `pnpm exec supabase db reset`.
4. Run `pnpm dev`. Before a release, run `pnpm release:check`.

Live provider tests require non-production Lenco and Resend credentials. CI deliberately does not simulate those providers.

## GitHub handoff

GitHub CLI was unavailable during initialisation. Install it, then run `gh auth login`, verify `gh auth status` shows `lenny105`, and run `gh repo create lenny105/zambia-loan-management-saas --private --source=. --remote=origin`, followed by `git push -u origin main` after the release gate passes.
