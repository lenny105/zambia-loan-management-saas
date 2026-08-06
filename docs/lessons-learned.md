# Engineering Lessons and Release Rules

**Status:** Mandatory project playbook  
**Owner:** EZER-X Media & Technology  
**Project:** Zambia Multi-Tenant Loan Management SaaS  
**Source application:** ZamRent  
**Adapted:** 6 August 2026

## Purpose

This document transfers production lessons from ZamRent into the Zambia Loan Management SaaS. Codex and every future engineer must read it before changing application code, database migrations, authentication, payments, notifications, deployment files or release workflows.

The historical incidents remain below because the exact symptoms and root causes matter. The current project must not merely remember them. Each applicable lesson must become one or more of:

- an automated test;
- a database constraint;
- an RLS or permission rule;
- a release check;
- an explicit provider or background-job state;
- structured monitoring with a correlation reference;
- an operational checklist item.

A feature is not complete when the interface looks correct. It is complete only when its database change, authorization boundary, provider confirmation, failure state, audit evidence and production build have been verified.

## Adaptation map for the loan SaaS

### 1. Prevent authenticated-page prerender failures

Authenticated operations, lender, borrower, billing and support pages are request-specific. They must not create Supabase clients, read sessions, cookies or required runtime configuration during static generation.

Current-project rules:

- mark protected App Router pages `force-dynamic` where required;
- defer environment access until the request or function boundary;
- never read cookies, headers, sessions or runtime secrets at module scope;
- require a clean optimized production build before push;
- test one protected route in the built application.

### 2. Use the actual Next.js deployment model

This is a server-rendered Next.js App Router application with route handlers, middleware and Supabase authentication. It is not a static Vite SPA.

Current-project rules:

- use Netlify's supported Next.js adapter and `.next` output;
- do not add a catch-all `/* -> /index.html` redirect;
- keep the Netlify build command identical to the local release command;
- pin Node and pnpm versions in source control;
- prepare Netlify configuration now but do not connect the repository until authorised later.

### 3. Separate deterministic CI from live integration tests

Generic CI must not start browser tests against missing Supabase, Lenco or Resend services.

Current-project rules:

- normal pull-request CI runs deterministic integrity, JSX, unit, lint, type and production-build checks;
- live end-to-end tests run only in a protected workflow with a dedicated non-production Supabase project and sandbox provider credentials;
- never add fake production fallbacks just to make CI green;
- report skipped live-provider checks honestly.

### 4. Test first-time and returning email authentication separately

Supabase signup and returning passwordless sign-in may use different templates and configuration.

Current-project rules:

- decide whether the release uses six-digit email OTPs, magic links or passwords and implement one coherent flow;
- if using OTP, both first-time and returning templates must use the token rather than an incompatible confirmation redirect;
- test new email, returning email, invalid code, expired code, resend and rate limits;
- set correct HTTPS Site URL and redirect allow-list values;
- never log OTPs or authentication email contents.

### 5. Model authentication identity separately from business records

A Supabase Auth user is not automatically a lender staff member, borrower, compliance reviewer or platform administrator.

Current-project rules:

- keep Auth identity, profile, tenant membership, borrower record and employment record separate;
- support both creation orders: borrower/application before portal signup and portal signup before borrower/application linking;
- normalise email in one database-controlled format;
- match only within the same tenant and only after verified identity rules pass;
- never grant tenant access merely because an email exists;
- require an eligible tenant-owned borrower or staff relationship before showing records.

### 6. Test complete relational chains from both interfaces

A successful insert from the lender workspace does not prove that the borrower portal can resolve the same application, agreement, schedule, receipt or statement.

Current-project rules:

- test lender workspace and borrower portal for every shared workflow;
- verify the full relationship chain, including tenant, borrower, application, product version, loan, agreement, schedule, transaction and document;
- reuse existing eligible records instead of silently creating duplicates;
- align status definitions and terminology across all routes.

### 7. Keep counts, lists, details and mutations consistent

A dashboard count must never report work that the destination page cannot show or process.

Current-project rules:

- use shared server queries or shared status definitions for badges, lists, details and actions;
- apply the same tenant, branch, role and lifecycle filters everywhere;
- do not turn a query failure into an empty list;
- repayment verification must atomically create the confirmed payment, allocation, balanced ledger entries and receipt or create none;
- uploaded evidence is not confirmed money;
- subscription initiation is not subscription payment confirmation.

### 8. Preserve safe diagnostic evidence

Generic errors without a reference make production failures difficult to resolve.

Current-project rules:

- log operation, route, actor, tenant, safe provider/database code and correlation ID;
- show users a safe explanation, next action and support reference;
- never expose SQL, tokens, raw provider payloads, stack traces, full NRC values, statements or payslips;
- never translate an unexpected database error into `No records found`.

### 9. Keep queue, provider acceptance and delivery states separate

An outbox row is not proof that Resend accepted or delivered an email.

Current-project rules:

- use distinct `queued`, `processing`, `sent`, `delivered`, `failed` and `requires_review` states;
- provider acceptance records `sent`; verified provider webhook records `delivered`;
- pause safely when Resend is not configured;
- WhatsApp remains unavailable until a real provider is integrated and must never be marked sent;
- expose retries and final review states to authorised operations users.

### 10. Enforce subscription and licence access at three layers

A hidden menu is not enforcement.

Current-project rules:

- make one effective-access decision using tenant status, lender verification, licence validity and subscription state;
- enforce it at route entry, database or domain-write boundary, and user-facing interface;
- keep billing and renewal access available when operational features are suspended;
- show clear reasons and required actions;
- do not create a trial lifecycle because this product has no free trial.

### 11. Prevent PL/pgSQL ambiguity and unsafe migration repair

Database functions must not use parameter names that collide with table columns.

Current-project rules:

- prefix function parameters with `target_`, `requested_`, `input_`, `payment_` or another clear domain prefix;
- qualify columns with table aliases;
- run linked Supabase database lint at error level after database changes;
- use forward-only corrective migrations for any linked environment;
- never edit an already-applied migration as the only production fix;
- never reset or destructively seed a linked production database.

### 12. Exclude demo language, fictional fallbacks and simulated success

Production screens must be backed by real database results and real provider states.

Current-project rules:

- test fixtures stay in test files or isolated development tooling;
- production empty states show zero real records and the next valid action;
- add an integrity scan that rejects production phrases and code paths such as `demo mode`, `fictional data`, `sample data`, fake success, hard-coded borrower records or simulated payments;
- never make a feature appear complete when a migration, Edge Function, webhook or provider configuration is missing.

## Mandatory project engineering rules

### Environment and secrets

1. Maintain `.env.example` with variable names, scope and purpose, never values.
2. Classify each variable as browser-safe or server-only.
3. Never expose Supabase service-role, database, Lenco, Resend, webhook, encryption, document-signing or scheduler secrets through `NEXT_PUBLIC_`.
4. Validate environment configuration at the boundary where it is used, not at module import time.
5. Configure local, CI, staging, Netlify runtime and Supabase Edge Function scopes separately.
6. Never commit, log, display or document production secrets.
7. Add secret scanning before push and in GitHub Actions.

### Next.js, React and build safety

1. Protected and request-specific routes must render dynamically when required.
2. Every component and `.map()` callback returns one valid JSX root.
3. Keep tags balanced and imports resolvable.
4. Use stable database keys for mapped rows.
5. Run JSX structure checks and a complete optimized Next.js build.
6. Never treat a development preview as proof that production builds.
7. Do not suppress build checks to obtain a green release.

### Supabase and multi-tenancy

1. Every tenant-owned row contains `tenant_id`.
2. Use composite foreign keys or equivalent constraints to prevent cross-tenant relationships.
3. RLS is mandatory for tables and Storage.
4. Never trust a tenant ID supplied by the browser.
5. Security-definer functions use a safe search path, validate the caller and receive minimum grants.
6. Test both access and denial for two tenants and multiple roles.
7. Run migration dry-run before push and database lint after applying migrations.
8. Use forward-only migrations and never destructively seed production.

### Payments and financial records

1. Lenco initiation is not payment confirmation.
2. A borrower repayment upload or external reference is not cleared money.
3. Verify amount, currency, internal reference, provider reference, status and idempotency before posting money or activating access.
4. Subscription activation, invoice settlement and receipt creation are atomic.
5. Borrower repayment confirmation, allocation, balanced ledger and receipt creation are atomic.
6. Confirmed financial records are immutable; corrections use linked reversals.
7. Never ask for or store a mobile-money PIN.
8. Pending, failed, review-required, successful, reversed and reconciled states remain visible and actionable.

### Authentication and identity

1. Test first-time and returning authentication separately.
2. Test invalid, expired and resent codes or links.
3. Normalize emails before matching.
4. Auth creation does not grant platform or tenant access.
5. Borrower portal access requires a tenant-owned borrower relationship.
6. Staff access requires an active tenant membership and role.
7. Never log OTPs, tokens or authentication content.

### Edge Functions, webhooks and jobs

1. Store webhook events before processing.
2. Verify signatures against the raw body using timing-safe comparison.
3. Make handlers idempotent and reject replayed event IDs whose payload changes.
4. Record attempts, locks, retries, final status, error summary and correlation ID.
5. Queue state is not delivery state.
6. Pause safely when a provider is not configured.
7. Deploy a database migration and its dependent Edge Function as one release unit.
8. Provide safe replay tools only to authorised platform roles.

### Performance and user experience

1. Avoid repeated page-level requests when one authorised server query can return the data.
2. Index tenant, status, date and foreign-key filters.
3. Preserve loading and mutation feedback.
4. An empty state means the query succeeded and returned no rows.
5. Errors show a safe next action and reference.
6. Ordinary users must not see unexplained internal terms such as RPC, worker, webhook or queue.
7. Badge, list, detail and action counts must reconcile.

## Mandatory release gate

Create one repository command:

```bash
pnpm release:check
```

It must run, at minimum:

1. production integrity and no-fictional-data checks;
2. JSX structure and component-resolution checks;
3. unit and component tests;
4. ESLint;
5. strict TypeScript checking;
6. the optimized Next.js production build.

For database releases, run:

```bash
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db push --linked
pnpm exec supabase db lint --linked --level error --fail-on error
```

For safe local or staging database tests, run the RLS, migration and cross-tenant test suite against the dedicated non-production project. Never point destructive tests at production.

Do not commit, push or deploy when a required check fails. Fix the root cause. Do not disable the check, weaken authorization, suppress an error or add fictional data to make it pass.

## Current-project pre-deployment checklist

Netlify connection is intentionally deferred. Before it is connected later, confirm:

- [ ] `netlify.toml` matches Next.js and is committed.
- [ ] Netlify will use the same `pnpm release:check` command used locally and in CI.
- [ ] Node and pnpm versions match CI.
- [ ] browser-safe Supabase variables exist at build and runtime.
- [ ] no server secret is exposed publicly.
- [ ] Supabase Site URL and redirect allow-list contain the production HTTPS domain.
- [ ] authenticated pages are not accidentally prerendered.
- [ ] a clean checkout passes `pnpm release:check`.
- [ ] sign-in, onboarding, operations sign-in, lender sign-in, borrower sign-in and one protected route behave correctly.
- [ ] logs contain no prerender, missing module, JSX, TypeScript or unresolved-environment errors.
- [ ] one real Lenco sandbox subscription journey has passed in staging.
- [ ] one real Resend staging message has reached `delivered` through a verified webhook.
- [ ] one complete lender and borrower journey has passed against a dedicated non-production Supabase project.

## Incident workflow for this project

For every production, staging, security, payment, authentication, database, notification or deployment failure:

1. preserve the exact action, time, tenant, actor, visible message and safe reference;
2. inspect deployment, application, Edge Function, webhook and database evidence before changing code;
3. classify the failure;
4. repair the smallest trustworthy boundary;
5. add a regression check, constraint, RLS rule or monitor;
6. update this file in the same change;
7. run the complete release gate;
8. deploy database and Edge Function dependencies in the correct order;
9. verify the affected route or job;
10. record any step that still requires real user or provider acceptance.

## Historical source: ZamRent engineering lessons

The following source text is retained so engineers can see the exact incidents, symptoms, root causes and prevention rules from the earlier application.

---
Status: mandatory project playbook

Owner: EZER-X Media & Technology

Last reviewed: 6 August 2026

## Purpose

This document records important ZamRent failures and converts each one into a
rule that prevents the same class of error in ZamRent and future applications.
It must be copied into every new EZER-X application and adapted before the
first production deployment.

Documentation is not the only safeguard. Every production failure should also
produce an automated check, database constraint, permission rule, or monitored
failure state whenever that is technically possible.

## Rules for maintaining this document

Update this file in the same change that fixes any of the following:

- A production or Netlify deployment failure.
- A CI or release-gate failure that revealed a missing safeguard.
- A security, cross-tenant, payment, authentication, or data-integrity defect.
- A user journey that appeared successful while the database operation failed.
- A repeated issue that previously required manual diagnosis.

Each incident entry must contain:

1. Symptom seen by the user or deployment platform.
2. Root cause.
3. Fix applied.
4. Prevention rule.
5. Automated protection added or still required.
6. Relevant commit or migration when available.

Do not add ordinary spelling mistakes or harmless local experiments. Record
failures that can affect production, security, money, user access, or future
delivery speed.

## Incident history

### 1. Netlify failed while prerendering the admin page

**Symptom**

Netlify compiled the application but failed while generating `/admin`:

```text
Error occurred prerendering page "/admin"
Error: Supabase is not configured for this environment.
Export encountered an error on /admin/page: /admin
```

**Root cause**

The authenticated admin page created a Supabase server client during static
generation. The required public Supabase variables were unavailable in the
build context, and the page had not been explicitly marked as runtime-only.

**Fix applied**

- Added `export const dynamic = "force-dynamic"` to the authenticated admin
  route.
- Deferred Supabase environment access until the server request path.
- Added the required browser-safe Supabase variables to Netlify.
- Kept Netlify on the same production build command used locally.

Relevant commit: `0118571 fix: defer Supabase access to runtime`.

**Prevention rule**

- Authenticated, request-specific, or live-data pages must not be statically
  prerendered accidentally.
- Mark those Next.js App Router pages `force-dynamic` where required.
- Never read cookies, authenticated sessions, or required runtime secrets at
  module scope.
- A development preview is not proof that `next build` succeeds.

**Automated protection**

`pnpm release:check` runs the optimized production build used by Netlify.

### 2. Netlify and local configuration used the wrong deployment model

**Symptom**

Early deployment guidance assumed a client-only application using `dist` and a
catch-all redirect. ZamRent is a server-rendered Next.js application with route
handlers and authentication middleware.

**Root cause**

Static SPA deployment settings were being considered for a Next.js App Router
application.

**Fix applied**

The versioned Netlify configuration now uses:

```toml
[build]
  command = "pnpm release:check"
  publish = ".next"
```

No `/* -> /index.html` redirect is used. Netlify's Next.js adapter handles
server routes and middleware.

Relevant commit: `f947fea chore: enforce Netlify release safety`.

**Prevention rule**

Choose deployment settings from the actual framework. Do not copy a Vite or
single-page-application Netlify configuration into a Next.js project.

### 3. GitHub end-to-end checks timed out without Supabase configuration

**Symptom**

The GitHub `tenant-mobile` end-to-end job started the web server without:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The home page threw `Supabase is not configured for this environment`, and the
test runner waited 120 seconds for a server that could not become ready.

**Root cause**

Environment-dependent browser tests were placed in the generic quality job
without a real, isolated Supabase test environment.

**Fix applied**

GitHub Actions was aligned with the deterministic production release gate.
Environment-dependent end-to-end tests were removed from the generic job until
they can run against a properly provisioned test project.

Relevant commit: `6fa3f0e Align GitHub checks with production release gate`.

**Prevention rule**

- Do not make CI start an integration environment that lacks its required
  services.
- Keep deterministic lint, type, unit, JSX, integrity, and build checks in the
  normal quality job.
- Put live end-to-end tests in a separate protected workflow with a dedicated
  non-production project and narrowly scoped secrets.
- Never solve CI failures by adding fictional runtime data to production code.

### 4. Email sign-in sent a confirmation link instead of an OTP

**Symptom**

New users received an email-address confirmation flow, and the link failed with
an invalid requested path instead of presenting the six-digit OTP experience.

**Root cause**

Supabase uses different templates for first-time signup and returning
passwordless sign-in. The confirmation template and production Site URL were
not aligned with the OTP-only application flow.

**Fix applied**

- Both **Confirm signup** and **Magic Link** templates use `{{ .Token }}`.
- Neither template uses `{{ .ConfirmationURL }}`.
- The application sends codes with `signInWithOtp` and verifies them with
  `verifyOtp` using type `email`.
- Supabase Site URL and redirect allow-list use complete HTTPS production URLs.

Relevant commit: `35acb71 fix: send email OTPs for new accounts`.

**Prevention rule**

- Test both a completely new email and a returning email before release.
- Test expired, incorrect, and resent codes.
- Treat authentication templates and URL configuration as production code.
- Never log OTP values.

### 5. A tenant existed but the portal was not linked

**Symptom**

The landlord saw `Portal not linked`, or the tenant could authenticate but
could not see the expected tenancy records.

**Root cause**

Authentication identity and landlord-owned tenant records can be created in
either order. Linking only during one creation path left legitimate existing
users or later-created tenant records disconnected.

**Fix applied**

The database now normalizes email addresses and links a verified Auth identity
when either side appears, while retaining the organization boundary.

Relevant commits and migrations:

- `ef18f17 Fix tenant portal linkage status`
- `14f6b43 Fix tenant tenancy agreement linking`
- `202607280006_tenant_portal_auto_link.sql`
- `202607310007_tenant_portal_verified_email_link.sql`

**Prevention rule**

- Model authentication identity separately from the tenant/person record.
- Support both creation orders: login before tenant creation and tenant
  creation before first login.
- Normalize email in one database-controlled format.
- Never link across organizations merely because two email addresses match.
- A portal-linked tenant still needs an eligible tenancy agreement before
  tenancy-specific data is shown.

### 6. Tenancy agreements did not appear for the connected tenant

**Symptom**

The tenant portal said `No active tenancy agreement`, and starting a new
agreement incorrectly asked the landlord to create another tenant.

**Root cause**

The agreement workflow did not consistently reuse existing tenant people and
did not resolve all eligible agreement and lease states through the same
organization-scoped relationship.

**Fix applied**

- Existing eligible tenants are selectable during agreement creation.
- Tenant agreement queries follow the verified user -> tenant profile ->
  person -> lease tenant -> agreement relationship.
- Agreement workflow states and user-facing terminology were aligned.

Relevant commits: `2777985`, `14f6b43`, and `31ff24d`.

**Prevention rule**

For every relational workflow, test the full chain from both user interfaces.
Do not assume that a successful landlord insert means the tenant query can
resolve the same record.

### 7. Bank-review count existed but the review list was empty

**Symptom**

The landlord dashboard showed one bank transfer awaiting review, but the bank
review page displayed nothing. In another case, selecting **Verify funds**
returned `The review could not be completed.`

**Root cause**

The badge, list, detail, and review mutation did not initially share the same
visibility and relationship assumptions. A later allocation edge case also
caused the atomic verification transaction to fail.

**Fix applied**

- Review list and detail routes were made explicit about missing rows and query
  failures.
- Database errors gained structured server logging and a support reference.
- The bank-transfer allocation transaction was corrected and affected jobs
  could be requeued safely.

Relevant commits and migrations:

- `2257f29 Fix live payment review flows`
- `31ff24d Fix payment review and clarify agreement workflow`
- `202607310008_bank_transfer_allocation_fix.sql`
- `202607310009_requeue_fixed_automation_events.sql`

**Prevention rule**

- A dashboard count and its destination list must use the same authorization
  and status definitions.
- Never treat uploaded proof as settled money.
- Verification must atomically create the payment, allocation, journal entry,
  and receipt or create none of them.
- Do not replace database errors with a misleading empty state.

### 8. Generic errors made the database appear to be hiding failures

**Symptom**

Several actions returned broad messages such as `could not be completed`,
making operational diagnosis slow and leaving the user without a useful
reference.

**Root cause**

Server routes discarded safe database context while correctly avoiding raw
error disclosure.

**Fix applied**

`lib/database/errors.ts` now records structured server-side failures and gives
the user a safe support reference without exposing SQL, private data, or
provider payloads.

**Prevention rule**

- Log the operation, route, authenticated actor, organization, safe error code,
  and correlation reference.
- Never expose secrets, SQL text, full provider payloads, or stack traces to
  the browser.
- Never turn an unexpected query error into `No records found`.

### 9. Notification jobs could appear successful without a provider

**Symptom**

Queued notifications were confusing when SMS, WhatsApp, or Resend was not
actually connected.

**Root cause**

A queue record is not evidence that an external provider accepted or delivered
the message.

**Fix applied**

- Email processing pauses when the provider configuration is incomplete.
- Unsupported SMS and WhatsApp jobs become `requires_review`, not `sent`.
- Resend API acceptance records `sent`; signed webhook confirmation records
  `delivered`.
- Retries and final review states remain visible.

Relevant commit: `75d4a44 Pause notifications until Resend is configured`.

**Prevention rule**

Keep `queued`, `processing`, `sent`, `delivered`, `failed`, and
`requires_review` separate. Never simulate provider success.

### 10. Subscription expiry originally stopped at read-only access

**Symptom**

The subscription design did not fully enforce the requested lifecycle or
explain unavailable higher-tier features.

**Root cause**

Commercial lifecycle state and feature descriptions existed, but there was no
single effective-access decision at the organization entry point.

**Fix applied**

- Trial expiry starts an exact seven-day grace period.
- Grace expiry suspends landlord workspace access.
- The billing route remains accessible so a verified Lenco tier payment can
  restore access.
- Tier entitlements are enforced in the database and shown as visible upgrade
  gates in the interface.

Relevant commit: `e3b9e10 Enforce subscription lifecycle and tier access`.

**Prevention rule**

Access rules must exist at three layers: route entry, database write/read
boundary where needed, and clear user-facing status. Do not merely hide a menu
item.

### 11. PostgreSQL function parameters produced an ambiguous-column error

**Symptom**

Remote Supabase database lint reported:

```text
column reference "provider_reference" is ambiguous
```

**Root cause**

A PL/pgSQL parameter used the same name as the column being updated.

**Fix applied**

The function used an unambiguous positional parameter and a forward-only
follow-up migration.

Relevant migration: `202607310011_customer_engagement_delivery_lint_fix.sql`.

**Prevention rule**

- Prefix parameters with `target_`, `requested_`, or `delivery_` and qualify
  table columns with aliases.
- Run `supabase db lint --linked --level error --fail-on error` after applying
  database changes.
- Never rely on editing an already-applied migration to repair production. Add
  a new forward-only migration. The older migration may also be corrected for
  clean installations, but production still requires the follow-up migration.

### 12. Demo language and fictional fallbacks survived into production

**Symptom**

The interface showed demo wording and fictional data even though the product
had moved to live testing.

**Root cause**

Development fallbacks and production empty states were not clearly separated.

**Fix applied**

- Runtime demo mode and fictional fallbacks were removed.
- Real empty states are backed by Supabase queries.
- The integrity checker rejects phrases including `demo mode`, `fictional
data`, `sample data`, and `add real data` in production source.

Relevant commit: `059daf7 feat: replace demo data with production accounts`.

**Prevention rule**

Use fixtures only in test files or isolated development tooling. Production
screens must never invent records or simulate successful writes.

## Mandatory engineering rules

### Environment and secrets

1. Maintain `.env.example` with names and explanations, never values.
2. Browser variables may contain only values safe to expose publicly.
3. Never use `NEXT_PUBLIC_` for service-role, Resend, Lenco, database, webhook,
   encryption, or scheduler secrets.
4. Validate the environment at the boundary where it is used, not at module
   import time.
5. Configure variables in every required platform scope: local development,
   CI test project, Netlify build/runtime, and Supabase Edge Functions.
6. Never paste production secrets into source code, Git, logs, screenshots, or
   documentation.

### Next.js and Netlify

1. Use the deployment model for the actual framework.
2. Netlify must run the same build command that passes locally.
3. Pin Node and package-manager versions in source control.
4. Authenticated and request-specific pages must render dynamically where
   required.
5. Do not access cookies, headers, sessions, or required runtime configuration
   at module scope.
6. Do not add a client-side SPA catch-all redirect to a Next.js server app.
7. Verify new protected routes on the deployed site after push; the expected
   unauthenticated result is a redirect to the correct sign-in page, not a 404
   or 500.

### JSX and React build safety

1. Every component and `.map()` callback must return one JSX root.
2. Keep tags balanced, nested correctly, and self-close empty elements.
3. Wrap multiline returned JSX in parentheses.
4. Import or define every referenced component.
5. Put JavaScript expressions inside braces; do not place statements directly
   inside JSX.
6. Give every mapped item a stable database key when one exists.
7. Write JSX comments as `{/* comment */}`.
8. Do not write JavaScript Unicode escapes directly in JSX text.
9. Recheck the complete component after every JSX edit.
10. The JSX AST scanner must pass; do not suppress its findings.

### Supabase and multi-tenancy

1. Every organization-owned row must contain `organization_id`.
2. Use composite foreign keys or equivalent constraints to prevent
   cross-organization relationships.
3. Never trust an organization ID supplied by the browser without membership
   and permission checks.
4. RLS is mandatory; hiding a UI control is not authorization.
5. Security-definer functions must set an empty `search_path`, validate the
   caller, and receive only the grants they require.
6. Test both access and denial: Organization A must not read or mutate
   Organization B.
7. Run migration dry-run before push and remote database lint after push.
8. Use forward-only corrective migrations for a linked production project.
9. Never reset or destructively seed the linked production database.

### Payments and financial records

1. Provider initiation is not payment confirmation.
2. Uploaded bank evidence is not cleared money.
3. Verify amount, currency, internal reference, provider reference, status, and
   idempotency before posting money.
4. Payment, allocation, balanced journal, and receipt creation must be atomic.
5. Confirmed financial records are immutable; corrections use reversals.
6. Never ask for or store a mobile-money PIN.
7. Every pending, failed, review-required, verified, reversed, and reconciled
   state must be visible and actionable.

### Authentication and identity

1. Test first-time signup separately from returning sign-in.
2. Test invalid, expired, and resent OTPs.
3. Normalize email addresses before matching.
4. Creating an Auth user must not automatically grant organization or tenant
   access.
5. Tenant portal access requires an organization-owned tenant relationship and
   the required tenancy relationship.
6. Never log OTPs, session tokens, or authentication email contents.

### Edge Functions, webhooks, and background jobs

1. Store webhook events before processing them.
2. Verify signatures using the raw body and compare secrets in constant time.
3. Make handlers idempotent and reject duplicate events whose payload changes.
4. Record attempts, locks, retries, final status, error summary, and correlation
   reference.
5. Queue state is not delivery state.
6. A worker must pause safely when its provider is not configured.
7. Deploy the Edge Function and its database migration as one release unit.

### Performance and user experience

1. Do not make repeated page-level requests for data that can be returned by
   one authorized server query.
2. Index columns used repeatedly for organization, status, date, and foreign
   key filters.
3. Use route loading states and preserve responsive feedback during mutations.
4. Empty states must mean the query succeeded and returned no rows.
5. Errors must provide a safe next action and support reference where useful.
6. Never display unexplained internal words such as queue, job, worker, RPC, or
   webhook to ordinary users.

## Mandatory release gate

From the repository root, run:

```bash
pnpm release:check
```

For ZamRent this includes:

1. Product integrity checks.
2. JSX structure and component-resolution checks.
3. Unit and component tests.
4. ESLint.
5. Strict TypeScript checking.
6. The optimized Next.js production build.

For database releases also run:

```bash
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db push --linked
pnpm exec supabase db lint --linked --level error --fail-on error
```

For an application with a safe, dedicated local Supabase stack, also run its
RLS and migration tests. Never point destructive test commands at production.

Do not commit, push, or deploy when a required check fails. Fix the underlying
cause; do not disable the check, hide the error, weaken authorization, or add
fake data merely to obtain a green build.

## Netlify pre-deployment checklist

- [ ] `netlify.toml` matches the framework and is committed.
- [ ] Netlify uses the exact local release command.
- [ ] Node and package-manager versions match CI.
- [ ] Required public environment variables exist at build and runtime.
- [ ] No server secret is exposed as a public variable.
- [ ] Supabase Site URL and redirect allow-list contain the production HTTPS
      domain.
- [ ] Authenticated pages are not accidentally prerendered.
- [ ] `pnpm release:check` passes from a clean checkout.
- [ ] The deployed home, landlord sign-in, tenant sign-in, admin sign-in, and
      one protected route return the expected status.
- [ ] Netlify logs contain no prerender, missing module, JSX, TypeScript, or
      unresolved environment error.

## Production incident workflow

When an error is reported:

1. Preserve the exact user action, time, organization, safe reference, and
   visible message.
2. Read deployment, application, Edge Function, webhook, and database evidence
   before changing code.
3. Determine whether the failure is display-only, authorization, relational,
   financial, provider, configuration, or deployment related.
4. Repair the smallest trustworthy boundary.
5. Add a regression check or integrity rule.
6. Update this document with root cause and prevention.
7. Run the complete release gate.
8. Deploy database and Edge Function dependencies in the correct order.
9. Push the application and verify the live route.
10. Record anything that still requires a real user or provider acceptance
    test.

## Incident entry template

Copy this section for future incidents:

```markdown
### Incident title

**Date:** YYYY-MM-DD

**Affected area:** Authentication / Netlify / Payments / Database / Other

**Severity:** Low / Medium / High / Critical

**Symptom**

What the user or deployment platform showed.

**Root cause**

The technical and process reason the failure was possible.

**Fix applied**

The code, migration, configuration, or operational correction.

**Prevention rule**

The rule future work must follow.

**Automated protection**

The test, lint rule, constraint, monitor, or release check added.

**References**

Commit, migration, provider event, or safe support reference.
```

## Starting the next EZER-X application

Before writing product features:

1. Copy this document into `docs/lessons-learned.md`.
2. Choose and document the hosting model before creating deployment files.
3. Create `.env.example` and classify every variable as public or secret.
4. Add lint, typecheck, tests, JSX checks where applicable, and a production
   build to one release command.
5. Configure CI to run that same release command.
6. Add structured server errors and correlation references at the start.
7. Design organization isolation and permission checks before the first data
   table.
8. Create separate non-production provider and database environments for live
   integration tests.
9. Add an incident-entry requirement to the pull-request checklist.
10. Do not call the first release production-ready until a clean Netlify build,
    authentication test, authorization-denial test, and one complete core user
    journey have passed.

## ZamLoan incidents

### Extension function was outside the migration search path

**Date:** 2026-08-06

**Affected area:** Database

**Severity:** Low

**Symptom**

The development database rejected the onboarding migration because `digest`
could not be resolved, although `pgcrypto` was installed.

**Root cause**

Supabase installed `pgcrypto` in the `extensions` schema and the migration
called the function without a schema qualifier.

**Fix applied**

The migration now calls `extensions.digest` explicitly. The failed migration
was transactional and left no partial database state.

**Prevention rule**

Schema-qualify extension functions and execute dry-run, fail-fast push, then
remote lint in that order.

**Automated protection**

The linked development migration apply is part of the release workflow; the
shell sequence exits immediately when dry-run or push fails so a later lint
success cannot mask the failure.

**References**

Migration `202608060003_onboarding_workflow.sql`.
