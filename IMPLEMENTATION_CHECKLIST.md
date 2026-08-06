# Phase 0–2 implementation checklist

- [x] Next.js, strict TypeScript, Tailwind, pnpm and Netlify model
- [x] Use-boundary environment validation and structured correlation logging
- [x] Release command, deterministic CI and tests
- [x] Initial identity, tenant, compliance, plans, billing and outbox schema
- [x] RLS helpers, selected explicit policies and private Storage buckets
- [x] Operation activation authority in TypeScript and PostgreSQL
- [x] Raw-body Lenco signature verification
- [ ] Complete authenticated mutations and Supabase-backed screen data
- [ ] Deploy Edge Functions for Lenco polling and Resend processing
- [ ] Provision dedicated non-production Lenco and Resend environments
- [x] Provision and link dedicated ZamLoan Development Supabase project
- [x] Execute migration push dry-run, remote push and database lint
- [x] Implement email OTP client flow, cookie refresh and protected route authorities
- [x] Implement persistent business, licence, private evidence upload, declaration and submission workflow
- [x] Enforce onboarding submission atomically with status history and audit events
- [ ] Execute live authentication, RLS and Playwright E2E tests
- [ ] Generate and store immutable invoice and receipt PDFs
- [x] Authenticate GitHub CLI as `lenny105`, create private remote and push
