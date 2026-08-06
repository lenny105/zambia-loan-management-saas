# Database and migrations

Forward-only SQL migrations live in `supabase/migrations`. For a linked non-production project run, in order: `pnpm exec supabase db push --linked --dry-run`, `pnpm exec supabase db push --linked`, then `pnpm exec supabase db lint --linked --level error --fail-on error`. Never reset a linked production project.

The first migration establishes identity, tenant compliance, effective-dated plans, immutable billing records, Lenco event idempotency, the durable email outbox, audits, jobs, integration logs and indexes.
