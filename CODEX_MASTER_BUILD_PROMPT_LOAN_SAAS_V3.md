# Codex Master Build Prompt
## Zambia Multi-Tenant Loan Management SaaS

You are the lead product engineer responsible for building a real production SaaS for EZER-X Media & Technology Limited.

Read and treat `ZAMBIA_LOAN_MANAGEMENT_SAAS_MASTER_SPEC.md` as the binding product specification.

Do not produce only a plan, mock-up or design concept. Build the application in working vertical slices. Continue until the current phase is implemented, migrated, tested and documented. Do not stop after scaffolding.

---

## 1. Non-negotiable product boundary

This is software for verified lenders. EZER-X is not a lender, loan broker, credit decision-maker, disbursement service, repayment collector, collateral holder or debt collector.

The platform must never:

- set a lender’s interest rate;
- approve or reject a borrower automatically;
- disburse borrower loans;
- collect borrower repayments through the EZER-X Lenco account;
- hold or control collateral;
- automatically repossess or sell collateral;
- earn a percentage of loans, interest, repayments or recoveries;
- activate an unverified or unlicensed lender;
- enable compound interest.

Lenco is used only for tenants paying monthly or annual SaaS subscriptions to EZER-X.

The tenant owns and controls its loan products, decisions, disbursements, repayments, collateral and borrower relationship.

---

## 2. Required engineering stack

Use:

- current stable Next.js App Router;
- React;
- strict TypeScript;
- pnpm;
- Tailwind CSS;
- a clean accessible component library;
- Zod;
- React Hook Form;
- Supabase PostgreSQL, Auth, Storage, Edge Functions and Cron;
- Netlify-compatible deployment;
- Vitest and React Testing Library;
- Playwright;
- GitHub Actions.

Use a modular monolith. Keep modules clear but do not introduce microservices.

Use ZMW and `Africa/Lusaka`.

Store money as integer ngwee, never floating-point numbers.

Use light-theme, clean, premium, mobile-first interfaces. Do not overcrowd screens.

---

## 3. Existing integrations

### Lenco

Use Lenco API v2 with environment variables. The production account already exists, but never place credentials in code.

Implement:

- mobile-money subscription collection;
- unique internal references;
- MTN, Airtel and Zamtel options only when enabled by the Lenco account;
- server-side initiation;
- `X-Lenco-Signature` verification using the documented HMAC-SHA512 process;
- raw event storage and payload hash;
- idempotent webhook processing;
- status re-query;
- 30-minute polling fallback for pending collections;
- activation only after verified successful status;
- no activation on `pending` or `pay-offline`;
- reconciliation console;
- immutable invoices and receipts.

### Resend

Use the existing Resend account through environment variables.

Implement:

- server-side sends;
- verified sender configuration;
- durable email outbox;
- idempotency keys;
- webhook delivery tracking;
- retries;
- visible failures;
- safe responsive templates;
- no silent failures.

Email is the only borrower notification channel in the first release. Do not fake WhatsApp support.

### Employment and income evidence

The borrower application module must support employed, self-employed, business-owner, pensioner, student, unemployed and tenant-configured applicant categories.

For employed applicants, lenders must be able to require:

- employer and job details;
- employment type and dates;
- gross and net monthly pay;
- the latest three distinct monthly payslips;
- the latest three months of bank statements;
- an employment letter or contract where configured.

For self-employed or business applicants, allow the lender to configure business registration, business bank statements, mobile-money statements and other income evidence.

Create a product-specific document checklist. Detect missing months, duplicated periods, rejected files and expired evidence. Never automatically declare a document authentic. An authorised lender user must review and accept or reject each file. Any waiver must capture user, reason and timestamp.

Use accepted figures to calculate average net monthly income, declared obligations, proposed instalment, disposable income and debt-service ratio. These are lender decision-support calculations only and must not automatically approve or decline the application.

Payslips and statements are highly sensitive. Store them in private tenant-scoped storage, use short-lived signed URLs, restrict access by role and audit views, downloads and reviews.

---

## 4. Repository behaviour

First inspect the repository.

If it is empty:

1. initialise the Next.js TypeScript app using pnpm;
2. add the required dependencies;
3. create the project structure;
4. configure Netlify;
5. configure Supabase local development;
6. create `.env.example`;
7. create CI;
8. create the first migrations.

If code already exists:

1. inspect architecture, package manager and existing conventions;
2. preserve useful working code;
3. remove unsafe or conflicting patterns;
4. write migrations rather than making undocumented dashboard-only changes;
5. document any necessary migration or compatibility decision.

Do not ask for information that can be inferred from the specification or repository. Ask only when a missing external credential, domain, account permission or legal text genuinely blocks completion.

---

## 4A. GitHub repository creation and push

The GitHub username is:

```text
lenny105
```

Use this official private repository:

```text
lenny105/zambia-loan-management-saas
```

At the beginning of the build:

1. Run `gh auth status` and confirm the authenticated account is `lenny105`.
2. Check whether `lenny105/zambia-loan-management-saas` already exists.
3. If it does not exist, create it as a private repository using GitHub CLI.
4. Initialise the local project repository if necessary.
5. Set `main` as the default branch.
6. Create a secure `.gitignore`.
7. Scan staged files for secrets before every push.
8. Commit the initial production foundation.
9. Set the GitHub repository as `origin`.
10. Push `main`.
11. After each completed vertical slice, run all checks, commit and push the tested work.
12. Never force-push to `main`.
13. Never commit secrets, `.env` files, borrower documents, lender licence documents or production exports.
14. Add GitHub Actions for lint, type-check, tests, build and migration verification.
15. Do not connect the repository to Netlify and do not deploy to Netlify yet. Netlify will be connected later when the application is substantially complete and close to launch.

Use commands equivalent to:

```bash
gh auth status
gh repo view lenny105/zambia-loan-management-saas   || gh repo create lenny105/zambia-loan-management-saas --private --source=. --remote=origin
git branch -M main
git add .
git commit -m "chore: initialise production loan management SaaS"
git push -u origin main
```

Before `git add .`, confirm that `.gitignore` excludes all secret and local files.

If GitHub CLI authentication is missing, do not invent or request a token inside source code. Complete the local setup and report the exact `gh auth login` step needed.

---

## 5. No fake production behaviour

Do not add visible demo tenants, fake borrowers, fake loans, fake payments, fictional dashboards or sample transactions to production.

Permitted:

- isolated test fixtures;
- factory data inside automated tests;
- Lenco sandbox in local/staging;
- a clearly separated developer-only test environment.

Production seed scripts may create only:

- required static configuration;
- permission definitions;
- regulatory baseline configuration;
- the first authorised platform admin when supplied securely.

Empty states should explain the real next action rather than inserting sample data.

---

## 6. Multi-tenant security

Every tenant-owned table must include `tenant_id`.

For every table and Storage bucket:

- enable RLS;
- write explicit `USING` and `WITH CHECK`;
- derive access from authenticated tenant membership;
- never trust a client-provided tenant ID;
- enforce role and branch scope server-side;
- test cross-tenant access denial;
- protect signed file URLs;
- use private buckets;
- keep service-role access server-side only.

Any `SECURITY DEFINER` function must:

- be placed outside the exposed schema;
- set a safe empty or explicit search path;
- validate `auth.uid()`;
- re-check tenant membership;
- re-check role permission;
- reject mismatched tenant/entity ownership;
- have restricted execute grants.

Build automated tests that attempt ID manipulation across two tenants.

---

## 6A. Mandatory lessons from the previous application

Before writing or modifying code, read all three supplied files:

```text
ZAMBIA_LOAN_MANAGEMENT_SAAS_MASTER_SPEC.md
CODEX_MASTER_BUILD_PROMPT_LOAN_SAAS.md
docs/lessons-learned.md
```

The source build pack includes `LOAN_SAAS_ENGINEERING_LESSONS_AND_RELEASE_RULES.md`. Copy it to `docs/lessons-learned.md` in the repository before Phase 0 work begins.

The lessons document is binding. Do not shorten it to a generic checklist or delete the historical incidents. Adapt it as new incidents occur.

Implement these safeguards from the beginning:

1. protected and request-specific Next.js pages render dynamically where required;
2. environment values are validated at their use boundary, never at module import time;
3. the application uses a real Next.js Netlify model with no SPA catch-all redirect;
4. deterministic CI does not depend on missing live Supabase or provider services;
5. live E2E tests use dedicated non-production Supabase, Lenco and Resend credentials;
6. first-time and returning authentication are tested independently;
7. Auth identity is separate from tenant membership and borrower records;
8. borrower and staff linking supports either creation order without crossing tenants;
9. dashboard counts, lists, details and mutations share status and authorization definitions;
10. database/provider failures produce structured logs and safe correlation references;
11. notification states never confuse queued, sent and delivered;
12. licence and subscription access is enforced at route, database/domain and UI layers;
13. PL/pgSQL parameters cannot collide with column names;
14. linked database repairs use forward-only migrations;
15. production code contains no demo data, fictional fallbacks or simulated success.

Create one mandatory command:

```bash
pnpm release:check
```

It must run production integrity checks, JSX structure checks, unit/component tests, ESLint, strict TypeScript and the optimized Next.js build.

The same command must run locally, in GitHub Actions and later in Netlify. Do not push when it fails.

For linked database changes run dry-run, push and lint in the documented order. Never run destructive tests against production.

Every future incident must update `docs/lessons-learned.md` and add an automated protection whenever technically possible.

---

## 7. First implementation target

Implement Phases 0, 1 and 2 from the master specification first as one complete production vertical slice.

That means the first deliverable must include:

### Foundation

- Next.js app;
- TypeScript strict mode;
- pnpm;
- Tailwind and reusable UI;
- environment validation;
- Supabase clients;
- error boundaries;
- structured logs;
- CI;
- tests;
- Netlify configuration;
- migration workflow.

### Identity and roles

- platform users and roles;
- tenant memberships and roles;
- MFA requirement for platform admins;
- protected route groups;
- server-side permissions;
- audit events.

### Tenant onboarding

- account registration and email verification;
- business profile;
- PACRA and TPIN fields;
- licence details;
- private compliance document upload;
- declaration acceptance;
- submission;
- status tracking.

### Operations compliance console

- pending applications;
- tenant detail;
- document review;
- request-more-information;
- approve;
- reject;
- suspend;
- expiry handling;
- reviewer notes;
- full audit trail.

### Plans and pricing

- operations CRUD for plans;
- monthly and annual prices;
- effective-dated versions;
- entitlements and limits;
- no free trial;
- no hard-coded frontend prices.

### Subscription billing

- plan selection;
- platform invoice;
- Lenco mobile-money request;
- payment pending screen;
- webhook endpoint;
- signature verification;
- status polling;
- successful activation;
- failed payment handling;
- grace/suspension states;
- EZER-X receipt;
- finance/reconciliation screen.

### Activation gate

Create one server-side authority function equivalent to:

```text
tenant_can_operate =
  verification approved
  AND licence not expired
  AND subscription active or permitted grace
  AND tenant active
```

Use it in every future live-loan write path.

---

## 8. Database requirements for the first slice

Create migrations for at least:

```text
profiles
platform_users
platform_roles
platform_user_roles
tenants
tenant_status_history
tenant_memberships
tenant_roles
tenant_role_permissions
tenant_verification_profiles
tenant_licences
tenant_licence_documents
verification_reviews
verification_decisions
compliance_declarations
legal_document_versions
legal_acceptances
subscription_plans
plan_versions
plan_entitlements
tenant_subscriptions
subscription_invoices
subscription_invoice_lines
subscription_payment_attempts
lenco_collections
lenco_webhook_events
subscription_receipts
subscription_adjustments
support_cases
support_access_grants
audit_events
job_runs
integration_logs
email_outbox
email_messages
email_webhook_events
```

Use:

- foreign keys;
- unique constraints;
- check constraints;
- useful indexes;
- immutable payment and receipt rules;
- idempotency constraints;
- updated-at triggers;
- status-transition functions where appropriate;
- RLS for all exposed records;
- Storage RLS for licence documents and platform billing PDFs.

Do not leave security policies for later.

---

## 9. Subscription state machine

Use a controlled state machine such as:

```text
pending_verification
verification_approved
invoice_pending
payment_pending
active
grace
past_due
suspended
cancelled
expired
```

Do not let the browser directly change subscription state.

Only a server-side transaction may activate a subscription after:

- invoice is open;
- amount and currency match;
- tenant and plan match;
- Lenco reference matches;
- verified status is successful;
- event is not previously processed.

Store state history.

---

## 10. Lenco webhook security

Implement the webhook using the raw request body so signature verification is deterministic.

Requirements:

1. accept POST only;
2. read raw body;
3. obtain `X-Lenco-Signature`;
4. derive webhook hash key from the API token using SHA-256 as documented;
5. calculate HMAC-SHA512 of the exact payload;
6. compare signatures using a timing-safe comparison;
7. reject or safely acknowledge invalid signatures without processing;
8. store event ID/reference and payload hash;
9. use a database transaction;
10. lock the invoice/payment row;
11. verify amount, currency and reference;
12. process idempotently;
13. re-query Lenco when the event is ambiguous;
14. activate only after verified success;
15. generate receipt once;
16. queue confirmation email once;
17. return quickly and process heavy work safely.

Add tests for forged signatures, replay, duplicate reference, mismatched amount, mismatched tenant and repeated successful events.

---

## 11. Resend outbox

Do not send critical email directly from page actions.

Create an outbox record in the same transaction as the business event, then process it through a worker/Edge Function.

Each outbox item includes:

```text
tenant_id nullable for platform mail
message_type
recipient
subject
template_version
payload
idempotency_key
status
attempt_count
next_attempt_at
provider_message_id
last_error
created_at
sent_at
```

Use Resend idempotency keys.

Track delivery, bounce and complaint events.

Show failures in the operations console.

---

## 12. PDF billing documents

Generate EZER-X branded subscription invoices and receipts server-side.

Each document includes:

- EZER-X legal/business identity from platform settings;
- tenant legal name;
- invoice or receipt number;
- plan;
- billing period;
- amount in ZMW;
- payment status;
- Lenco reference where appropriate;
- issue/payment date;
- document hash;
- footer and support contact.

A receipt is created only after verified successful payment.

Store the PDF in private Supabase Storage and issue short-lived signed download URLs.

---

## 13. UX requirements for the first slice

Create real polished screens for:

### Public

- sign in;
- create lender account;
- verify email;
- forgot/reset password;
- privacy and terms;
- status page for submitted onboarding.

### Tenant onboarding

- business details;
- licence details;
- uploads;
- declaration;
- review summary;
- submit;
- status and requested changes;
- choose plan;
- pay by mobile money;
- payment status;
- subscription receipt;
- tenant setup checklist.

### Operations console

- overview;
- verification queue;
- tenant review;
- plans and pricing;
- subscriptions;
- invoices;
- Lenco payments;
- reconciliation;
- email delivery;
- audit;
- support.

Use strong loading, empty, error and degraded-integration states.

Do not use fake metrics. When there is no data, show zero and a clear action.

---

## 14. Audit requirements

Write append-only audit events for:

- account creation;
- email verification;
- login and MFA changes;
- role changes;
- compliance submission;
- file upload;
- request for information;
- approval/rejection/suspension;
- licence edit/renewal/expiry;
- plan creation/change;
- subscription selection/change;
- invoice creation;
- payment initiation;
- webhook processing;
- activation/suspension;
- receipt generation;
- email queue/send/failure;
- support access.

Include actor, tenant, entity, action, reason, IP, user agent, timestamp and correlation ID.

Do not log secrets or unnecessary full identity values.

---

## 15. Tests required before first slice is complete

Run and pass:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Add tests proving:

- an unapproved tenant cannot reach subscription activation;
- an approved tenant with no successful payment remains inactive;
- a successful verified Lenco payment activates once;
- duplicate webhooks do not duplicate receipts or emails;
- tenant A cannot access tenant B;
- operations permissions are enforced;
- licence files are private;
- a suspended tenant is blocked;
- invoice and receipt totals use integer minor units;
- no client can set its own subscription status or price.

---

## 16. Documentation required

Create and maintain:

```text
README.md
docs/architecture.md
docs/database.md
docs/rls.md
docs/lenco.md
docs/resend.md
docs/deployment.md
docs/incident-response.md
docs/operations-runbook.md
docs/legal-launch-checklist.md
docs/lessons-learned.md
.env.example
```

Document exact steps for:

- local setup;
- Supabase migrations;
- creating the first platform admin;
- setting Lenco credentials;
- registering the Lenco webhook;
- setting Resend domain and webhook;
- Netlify deployment;
- production release;
- rollback;
- payment reconciliation;
- handling failed jobs;
- suspending a tenant;
- restoring a backup.

---

## 17. After the first slice

Once Phases 0–2 pass all acceptance tests, continue in this order without rebuilding the foundation:

1. tenant branches, roles and branding;
2. borrower, employment and income profiles;
3. payslip and bank/mobile-money statement collection, three-month completeness checks and lender document review;
4. affordability assessment using lender-accepted figures;
5. lender-owned loan products;
6. simple-interest engine and schedule;
7. human approval workflow;
8. agreement and borrower acceptance;
9. disbursement recording;
10. immutable repayment ledger;
11. branded receipts and statements;
12. collateral register and enforcement guardrails;
13. Resend borrower reminders;
14. analytics and reports;
15. security hardening and launch.

Use the master specification for each module.

For the borrower and application module, migrations must include or equivalent:

```text
borrower_employment
borrower_income_sources
employment_verifications
income_document_periods
financial_document_reviews
affordability_assessments
application_documents
```

Required tests must prove that:

- a lender can require exactly three monthly payslips and three statement periods;
- duplicate monthly periods do not satisfy the requirement;
- missing and rejected periods remain outstanding;
- another tenant cannot view or download the files;
- unauthorised roles cannot reveal the files;
- an authorised reviewer can accept, reject or waive with an audit trail;
- affordability uses only accepted lender-reviewed figures;
- calculations never automatically approve or decline an application.

---

## 18. Working method

For every vertical slice:

1. inspect existing code;
2. write or update migrations;
3. write RLS before exposing data;
4. implement server-side domain logic;
5. implement UI;
6. add audit events;
7. add background-job handling;
8. add unit, database and end-to-end tests;
9. run `pnpm release:check` and all applicable database checks;
10. update documentation, including `docs/lessons-learned.md` when a defect or missing safeguard is found;
11. report exact files changed, migrations added, commands run and remaining blockers.

Do not claim an integration is complete unless it makes real authenticated API calls in the correct environment and handles failure.

Do not hide incomplete work behind a successful-looking UI.

Do not leave silent catch blocks.

Do not use `any` to bypass typing on core domain code.

Do not use browser-local storage as the source of truth for permissions, payments, loan balances or subscription status.

---

## 19. Start now

Begin by:

1. reading `ZAMBIA_LOAN_MANAGEMENT_SAAS_MASTER_SPEC.md`;
2. reading this Codex master prompt;
3. copying `LOAN_SAAS_ENGINEERING_LESSONS_AND_RELEASE_RULES.md` to `docs/lessons-learned.md` and reading it fully;
4. confirming GitHub CLI authentication for `lenny105`;
5. creating or connecting the private repository `lenny105/zambia-loan-management-saas`;
6. inspecting the repository;
7. creating a concise implementation checklist inside the repository;
8. implementing Phase 0, including `pnpm release:check`, production integrity checks, JSX checks and structured error handling;
9. creating the complete initial database and RLS migrations for Phases 1–2;
10. implementing tenant onboarding and the operations compliance console;
11. implementing plan management and Lenco subscription billing;
12. implementing the Resend outbox;
13. running the complete release gate and applicable Supabase checks;
14. committing and pushing only after all required checks pass;
15. updating setup, deployment, incident and lessons-learned documentation.

Continue through the full first vertical slice. Stop only for a genuine external blocker such as missing credentials, an unavailable domain, an account permission or legal wording that cannot safely be invented.
