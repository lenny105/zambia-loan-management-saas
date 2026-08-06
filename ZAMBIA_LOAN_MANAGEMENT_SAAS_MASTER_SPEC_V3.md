# Zambia Multi-Tenant Loan Management SaaS
## Production Product and Technical Specification

**Document status:** Build-ready baseline  
**Prepared for:** EZER-X Media & Technology Limited  
**Market:** Zambia  
**Deployment model:** Multi-tenant subscription SaaS  
**Currency:** ZMW  
**Timezone:** Africa/Lusaka  
**Working product name:** Configurable through `APP_NAME`; do not hard-code a public brand name until approved.

---

## 1. Product decision

Build a production multi-tenant loan-management platform for **verified and authorised Zambian lenders**.

The platform is software only. EZER-X:

- does not lend money;
- does not advertise or recommend loan products to borrowers;
- does not approve or reject borrower applications;
- does not set lender interest rates, fees, penalties or credit limits;
- does not disburse loans;
- does not receive borrower repayments;
- does not hold, value, seize, sell or otherwise control collateral;
- does not act as a debt collector;
- does not earn a percentage of lender interest, loan value, repayments or collateral;
- charges lenders only for access to the software through monthly or annual subscriptions.

Each lender remains responsible for its licensing, customer due diligence, loan decisions, loan terms, agreements, disbursements, collections, collateral, notices, enforcement and compliance.

The system must enforce this separation in its database, workflows, interface text, contracts, audit records and payment integration.

---

## 2. Legal and compliance baseline

This specification is a technical compliance baseline, not a legal opinion. Before public launch, EZER-X should obtain a written review from a Zambian financial-services lawyer and written regulatory guidance where necessary.

### 2.1 Current position to design around

As checked on 5 August 2026:

- The Money-Lenders Act, Chapter 398, remains relevant to money-lending businesses. It requires licensing, written loan documentation, disclosure of principal and annual interest, borrower access to loan information, and prohibits compound interest.
- The Banking and Financial Services Act No. 9 of 2026 was enacted but was still listed as uncommenced in the legal sources checked. It is intended to replace the previous framework and repeal the Money-Lenders Act when brought into force.
- The Data Protection Act No. 3 of 2021 applies to the processing of borrower and lender personal data.
- The Data Protection Commission requires registration of data controllers and data processors.
- Electronic communications, signatures, records and notices must follow applicable Zambian electronic-transactions law.
- The platform must be capable of updating regulatory rules without rewriting the loan engine.

### 2.2 Product compliance rules

1. A tenant cannot issue a real loan until its compliance profile is approved by the platform compliance team.
2. PACRA registration alone is not accepted as proof of authority to conduct money lending.
3. The tenant must provide its applicable lender licence or regulatory approval, issuing authority, authorised business name, authorised address, issue date and expiry date.
4. Expired, rejected, suspended or revoked verification blocks new applications, approvals, agreements and disbursement recording.
5. Existing records remain readable and exportable after suspension.
6. Platform staff cannot edit tenant loan rates, approve tenant loans or post tenant borrower repayments.
7. No public directory, marketplace or matching service for lenders and borrowers is included.
8. No loan is funded through EZER-X or the EZER-X Lenco account.
9. Lenco is used only to collect SaaS subscription fees payable by lenders to EZER-X.
10. No automatic repossession, sale of collateral, legal threat, blacklisting or enforcement action.
11. Any enforcement workflow requires a named authorised lender user and recorded human approval.
12. Interest calculations must use simple-interest methods only. Compound interest is not supported.
13. All loan terms must be disclosed before borrower acceptance.
14. The annualised interest rate, principal, fees, total repayable amount, payment schedule and default terms must appear on the generated agreement.
15. Regulatory rules must be stored in effective-dated configuration so the platform can respond when the 2026 Act commences or regulations change.

### 2.3 Required legal launch documents

Prepare and have reviewed before production launch:

- EZER-X SaaS Terms of Service;
- lender verification and acceptable-use policy;
- data-processing agreement between EZER-X and each lender;
- privacy policy;
- borrower-facing privacy notice template;
- lender responsibility and regulatory compliance declaration;
- incident-response policy;
- information-security policy;
- data-retention policy;
- subprocessor list;
- email communication policy;
- template wording for payment reminders and arrears notices;
- platform disclaimer stating that EZER-X is not a lender, broker, credit decision-maker or debt collector.

---

## 3. Product users and roles

### 3.1 Platform roles

#### Platform Super Admin
Full platform control. Cannot silently impersonate a tenant. Any support access to tenant data requires a reason, time-limited elevation and audit event.

#### Platform Operations
Manages plans, prices, billing settings, subscription statuses, tenant activation and support cases.

#### Platform Compliance
Reviews lender applications, licence documents, expiry dates, authorised names and addresses. Can approve, reject, suspend and request more information.

#### Platform Finance
Views SaaS invoices, Lenco collections, settlements and reconciliation. Cannot access borrower loan records unless separately authorised for support.

#### Platform Support
Handles support tickets. Tenant data access is restricted, reason-based and audited.

#### Platform Auditor
Read-only access to platform activity, verification decisions, subscription payments and administrative actions.

### 3.2 Tenant roles

#### Tenant Owner
Controls the lender account, subscription, branches, users, branding, policies and final permissions.

#### Tenant Administrator
Manages users, roles, branding, products, templates and operational settings.

#### Branch Manager
Manages assigned branches and staff, reviews portfolio and approves actions within delegated limits.

#### Loan Officer
Registers clients, reviews applications, prepares assessments and submits recommendations.

#### Credit Approver
Approves or rejects applications within configured authority limits. Must not be the same user who created the application where maker-checker is enabled.

#### Accounts/Cashier
Records verified disbursements and repayments, issues receipts and performs reconciliation.

#### Collections Officer
Views due and overdue accounts, records contacts, promises to pay and follow-up actions. Cannot alter loan terms or seize collateral.

#### Compliance Officer
Reviews client documentation, tenant policies, exceptions, consents and audit evidence.

#### Tenant Auditor
Read-only access to tenant records, reports and audit history.

### 3.3 Borrower access

Borrowers may:

- submit an application from a lender-branded secure link;
- upload requested documents;
- review disclosed loan terms;
- accept or decline an agreement;
- download their agreement, schedule, receipts, statements and settlement confirmation;
- view balance and due dates;
- submit a query or correction request.

At launch, borrower portal access uses secure email magic links or password authentication. A phone number is still required for future WhatsApp communication. Staff-assisted applications may be created for a client without portal access, but digital acceptance requires an authenticated borrower or a documented in-person signing process.

---

## 4. Multi-tenant architecture

### 4.1 Required stack

Use the existing EZER-X production pattern:

- current stable Next.js App Router;
- React and strict TypeScript;
- pnpm;
- Tailwind CSS;
- accessible reusable component system;
- Zod validation;
- React Hook Form;
- Supabase PostgreSQL;
- Supabase Auth;
- Supabase Storage;
- Supabase Edge Functions for secret-bearing integrations;
- Supabase scheduled jobs/Cron for reminders, expiry checks and reconciliation;
- GitHub private repository under the approved EZER-X account;
- Netlify deployment for the web application;
- Vitest and React Testing Library;
- Playwright for end-to-end tests;
- GitHub Actions for type-checking, linting, tests and migration checks.

Use a modular monolith. Do not introduce microservices unless a measured scaling problem requires them.

### 4.2 Tenant isolation

Every tenant-owned business table must include `tenant_id uuid not null`.

Required controls:

- enable PostgreSQL Row Level Security on every exposed table;
- derive tenant access from authenticated membership, never from a client-supplied tenant ID alone;
- use an `auth_tenant_id()` or membership-check helper that validates `auth.uid()`;
- use explicit `USING` and `WITH CHECK` policies;
- validate role and branch scope server-side;
- do not rely on hidden buttons for authorisation;
- place privileged `SECURITY DEFINER` functions in a non-exposed schema;
- set a safe `search_path`;
- re-check membership, role and row ownership inside privileged functions;
- revoke unnecessary function execution privileges;
- add automated tests proving that one tenant cannot read, update, delete, download or infer another tenant’s data;
- apply equivalent RLS policies to Supabase Storage objects.

### 4.3 Storage paths

Use private buckets. Suggested object layout:

```text
tenant-assets/{tenant_id}/branding/...
tenant-licences/{tenant_id}/verification/...
borrower-documents/{tenant_id}/{borrower_id}/...
loan-documents/{tenant_id}/{loan_id}/...
collateral-documents/{tenant_id}/{collateral_id}/...
generated-documents/{tenant_id}/{document_id}/...
platform-billing/{tenant_id}/{invoice_id}/...
```

Signed URLs must expire. Never expose a permanent public URL for borrower, loan, identity, collateral or licence documents.

### 4.4 Monetary values

Store money as integer minor units:

```text
K 1.00 = 100 ngwee
```

Use `bigint` columns such as `principal_minor`, `interest_minor` and `amount_minor`. Never calculate money using JavaScript floating-point values.

Store:

- `currency char(3) default 'ZMW'`;
- dates as `date` where time is not relevant;
- timestamps as UTC `timestamptz`;
- display all operational times in `Africa/Lusaka`.

---

## 5. Platform operations console

The operations console is separate from the tenant workspace and must have its own route group and permissions.

### 5.1 Dashboard

Show:

- active verified tenants;
- tenants awaiting verification;
- expiring licences;
- active, past-due, suspended and cancelled subscriptions;
- monthly and annual SaaS revenue;
- successful, pending and failed Lenco collections;
- unresolved payment reconciliation cases;
- email delivery failures;
- system job failures;
- security and support events.

Platform revenue dashboards must use SaaS subscription records only. They must never combine lender loan performance with EZER-X revenue.

### 5.2 Tenant verification

Verification record must contain:

- legal business name;
- trading name;
- PACRA registration number;
- TPIN;
- physical and postal addresses;
- primary contact;
- directors or authorised representatives;
- lender licence/approval type;
- licence number;
- issuing authority;
- authorised lending name;
- authorised lending address;
- issue date;
- expiry date;
- uploaded certificate;
- review status;
- reviewer;
- review notes;
- rejection or suspension reason;
- verification audit history.

Statuses:

```text
draft
submitted
needs_information
under_review
approved
rejected
suspended
expired
revoked
```

Only `approved` and not expired can progress to subscription activation and live loan operations.

### 5.3 Plans and pricing

Operations users can create and change:

- plan name;
- monthly price;
- annual price;
- included branches;
- included users;
- active borrower limit;
- active loan limit;
- storage allowance;
- enabled modules;
- document allowance if applicable;
- support level;
- grace-period rules;
- effective date;
- public availability;
- grandfathering behaviour.

No free trial is implemented.

All prices and entitlements are read from the database. Do not hard-code package prices in the frontend.

A tenant cannot edit its own plan limits.

### 5.4 Support access

Support access must require:

- support case ID;
- reason;
- requested duration;
- approval where required;
- start and expiry time;
- visible banner while elevated;
- complete audit log.

No permanent impersonation mode.

---

## 6. Tenant onboarding and activation

### 6.1 Onboarding sequence

1. Tenant owner creates an account.
2. Email is verified.
3. Business profile is completed.
4. Licence and compliance documents are uploaded.
5. Terms, privacy notice and lender responsibility declaration are accepted.
6. Platform compliance reviews the application.
7. Tenant is approved or asked for more information.
8. Approved tenant selects a monthly or annual plan.
9. Lenco mobile-money collection is initiated.
10. Subscription activates only after a verified successful payment.
11. Tenant configures branding, branches, users, products and document numbering.
12. Tenant can begin live operations.

### 6.2 Activation gate

Implement one server-side function that determines live access:

```text
tenant_can_operate =
  verification.status = approved
  AND licence_expiry_date >= current_date
  AND subscription.status IN (active, grace)
  AND tenant.status = active
```

Every write that creates or advances a live loan must call this rule server-side.

### 6.3 Licence expiry

Create configurable alerts before expiry and notify:

- tenant owner;
- tenant compliance officer;
- platform compliance team.

On expiry:

- prevent new public applications;
- prevent new approvals and agreements;
- prevent recording new disbursements;
- retain read-only access to existing accounts;
- allow repayments, statements and data exports where legally and operationally appropriate;
- require platform compliance re-approval after renewal.

The exact allowed actions after expiry must be configurable because regulatory guidance may change.

---

## 7. Lenco integration for SaaS subscriptions only

### 7.1 Strict boundary

The EZER-X Lenco integration is for lender subscription payments only.

Never use the same integration to:

- disburse borrower loans;
- collect borrower repayments;
- pay out collateral proceeds;
- transfer money between borrowers and lenders;
- hold lender or borrower funds.

Label every Lenco record and interface clearly as **Platform Subscription Billing**.

### 7.2 Collection flow

Use Lenco API v2 from a server-side Supabase Edge Function.

Required steps:

1. Create a platform subscription invoice with a unique immutable reference.
2. Validate amount, currency, tenant and invoice status server-side.
3. Initiate `/collections/mobile-money`.
4. Store the Lenco collection ID, internal reference, Lenco reference, provider, number, amount, status and timestamps.
5. Treat `pending` and `pay-offline` as unpaid.
6. Verify `X-Lenco-Signature` using Lenco’s documented HMAC-SHA512 method and webhook hash key derived from the API token.
7. Store the raw webhook securely with a payload hash.
8. Enforce idempotency by event ID/reference and database constraints.
9. Re-query `/collections/status/{reference}` before granting access where appropriate.
10. Run a scheduled poll every 30 minutes for non-terminal collections because webhooks may be missed.
11. Activate or renew the subscription only after a verified `successful` status.
12. Generate an EZER-X subscription receipt only after payment verification.
13. Never mark an invoice paid based only on a redirect, frontend response or unverified webhook.

### 7.3 Networks

The checkout interface must support the Lenco-enabled mobile-money options available to the account, including:

- MTN Mobile Money;
- Airtel Money;
- Zamtel Kwacha.

Validate Zambian phone formats and normalise to E.164 internally.

Do not display a payment network unless it is enabled and confirmed by the Lenco account configuration.

### 7.4 Billing records

Required tables:

```text
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
billing_audit_events
```

Confirmed invoices and receipts are immutable. Corrections use credit notes, voids or reversal records.

---

## 8. Tenant branding and white-label documents

### 8.1 Branding settings

Each tenant can configure:

- logo;
- square icon;
- primary colour;
- secondary colour;
- accent colour;
- text colour;
- business name;
- trading name;
- slogan;
- authorised address;
- branch details;
- phone;
- email;
- website;
- footer;
- authorised signatory names and titles;
- stamp image where legally approved;
- document terms.

Validate colour contrast for accessibility. Prevent unsafe HTML, scripts and external tracking code.

### 8.2 Branded surfaces

Apply tenant branding to:

- tenant login and borrower application page;
- borrower portal;
- email header and footer;
- loan application acknowledgement;
- loan agreement;
- repayment schedule;
- disbursement confirmation;
- repayment receipt;
- account statement;
- balance confirmation;
- arrears reminder;
- settlement letter;
- collateral custody receipt;
- collateral release confirmation.

Platform subscription invoices and receipts must carry EZER-X branding, not lender branding.

### 8.3 Document engine

Generate official PDFs server-side using a deterministic template engine. Recommended implementation: `@react-pdf/renderer` in a protected server function.

Each generated document must store:

- tenant;
- document type;
- document number;
- source entity ID;
- template version;
- data snapshot;
- generated PDF path;
- SHA-256 content hash;
- generated by;
- generated at;
- status;
- superseded document ID where applicable.

Do not silently regenerate an old document with changed current data. Historical documents must remain reproducible from their original snapshot.

---

## 9. Client and borrower management

### 9.1 Client profile

Required fields:

- client number;
- legal name;
- NRC or approved identity type and number;
- date of birth;
- sex where lawfully required;
- phone;
- email;
- residential address;
- province, district and town;
- employment status: employed, self-employed, business owner, pensioner, student, unemployed or other tenant-configured category;
- employer or business name;
- job title or occupation;
- payroll or employee number where applicable;
- employment type: permanent, fixed-term, casual, contract, probation or other;
- employment start date and contract expiry date where applicable;
- gross income, statutory deductions, other deductions and net income;
- salary or income payment frequency;
- employer address, phone and email where lawfully required;
- other verified income sources;
- consent and authority for the lender to verify employment and income where required;
- next of kin or reference only where legally justified;
- preferred communication channel;
- consent and privacy notice version;
- risk and verification status;
- created by and timestamps.

Sensitive identity values should be masked in normal lists. Only authorised roles may reveal full values.

### 9.2 Duplicate checks

Within a tenant, check duplicate:

- NRC/identity number;
- phone;
- email;
- client number.

Do not expose whether the same person exists in another tenant.

### 9.3 Documents

Support upload, review and expiry tracking for:

- NRC/identity;
- proof of address;
- the latest three monthly payslips where required by the lender or loan product;
- the latest three months of bank statements where required;
- the latest three months of mobile-money statements where accepted by the lender;
- employment confirmation letter or contract;
- business registration and business-income evidence for self-employed applicants;
- pension statement or other lawful proof of recurring income;
- guarantor documents;
- collateral ownership evidence;
- other tenant-configured documents.

The lender must be able to configure required documents by loan product and applicant type. For example, employed applicants may require three payslips and three months of bank statements, while self-employed applicants may require business registration and business or mobile-money statements.

For every payslip or statement, store structured metadata without altering the original file:

- document category;
- statement or payroll month;
- period start and end dates;
- employer, bank or provider name;
- account holder or employee name as entered by the lender;
- masked account number where applicable;
- upload source: borrower or authorised staff;
- review status;
- reviewer and review date;
- rejection reason;
- expiry or validity date where applicable;
- file hash and version.

The application checklist must detect whether three distinct consecutive or lender-accepted monthly periods have been supplied. It must show missing months, duplicates, rejected files and expired documents. This is an administrative completeness check only; it must not automatically declare a document genuine or approve a loan.

Statuses:

```text
required
uploaded
under_review
accepted
rejected
expired
waived_by_authorised_user
```

Any waiver must record the authorised lender user, reason and timestamp.

Validate MIME type, file signature and size. Store all income and banking documents in private tenant-scoped storage. Restrict access to authorised lender roles, use short-lived signed URLs and log views, downloads, replacements and review decisions. Do not expose bank statements or payslips in general borrower lists or email attachments unless explicitly authorised.

### 9.4 Employment and income verification

The platform must support a lender-controlled verification workflow. It records the lender's checks but does not perform or guarantee employment verification on behalf of EZER-X.

Required capabilities:

- employment details entered by the borrower or lender staff;
- comparison of borrower name, employer and pay period across submitted payslips;
- capture of gross pay, deductions and net pay for each of the latest three months;
- calculation of average net monthly income from accepted documents;
- capture of other recurring income and existing declared obligations;
- lender review of bank or mobile-money statement inflows and recurring deductions;
- optional employer contact and verification note;
- verification outcome: pending, verified by lender, partly verified, unable to verify or rejected;
- reviewer, date, method, evidence and notes;
- full audit history.

The system may calculate affordability indicators from lender-approved figures, including:

- average net monthly income;
- total declared monthly debt obligations;
- proposed instalment;
- disposable income after proposed instalment;
- debt-service ratio.

The lender defines its own affordability thresholds. The system displays calculations and warnings but does not automatically approve or decline the application.

---

## 10. Loan products and lender-controlled terms

### 10.1 Platform neutrality

Loan products belong to the tenant. EZER-X does not create, recommend or approve them.

Tenant authorised users configure:

- product name;
- product code;
- minimum and maximum principal;
- minimum and maximum term;
- allowed repayment frequencies;
- allowed interest calculation method;
- lender-entered interest rate;
- permitted fees;
- default rules;
- applicant eligibility categories;
- whether employment or recurring income is required;
- required document sets by applicant type, including the number of payslip and statement months;
- accepted income evidence and statement types;
- lender-defined affordability thresholds and review warnings;
- required documents;
- required collateral;
- approval workflow;
- branch availability;
- active dates.

Every change creates a new product version. Existing loans retain the product and calculation version used at approval.

### 10.2 Interest methods

Initial production release supports only:

1. **Flat simple interest**
2. **Declining-balance simple interest**

Do not support compound interest, interest-on-interest or capitalisation of unpaid interest.

Store the lender-entered rate and normalise it to an annual percentage for disclosure.

Before agreement issue, show:

- principal;
- annual interest rate;
- calculation method;
- total interest;
- each fee;
- total cost;
- total repayable;
- instalment amount;
- payment dates;
- default interest rule;
- collateral summary;
- cooling-off or cancellation wording where applicable.

### 10.3 Regulatory rule engine

Create effective-dated tables:

```text
regulatory_rule_sets
regulatory_rules
regulatory_rule_versions
regulatory_warnings
```

Rules can:

- block prohibited calculation methods;
- require annual-rate disclosure;
- require specific agreement fields;
- warn when a configured rate crosses a legal-review threshold;
- restrict default interest;
- require borrower copy delivery;
- require maker-checker approval;
- require a licence type;
- change by effective date.

The rule engine must distinguish:

- hard block;
- warning requiring acknowledgement;
- informational notice.

Do not encode a permanent legal conclusion only in frontend code.

---

## 11. Application and loan lifecycle

### 11.1 Application statuses

```text
draft
submitted
needs_information
under_review
recommended
declined
approved
cancelled
expired
```

### 11.2 Loan statuses

```text
agreement_pending
agreement_issued
accepted
disbursement_pending
active
overdue
restructured
settled
written_off
cancelled
```

### 11.3 Workflow

1. Borrower or staff creates an application and selects the applicant's employment or income category.
2. The system creates a product-specific document checklist.
3. The borrower or authorised staff uploads required evidence, including the latest three payslips and three months of bank or accepted mobile-money statements where configured.
4. Client receives a lender-branded acknowledgement and can see outstanding document requirements.
5. Loan officer reviews identity, employment, income, affordability, document completeness and collateral.
6. The system calculates average accepted income, affordability indicators and repayment options from lender-entered terms.
7. Loan officer records verification outcomes and recommends but cannot approve where maker-checker is enabled.
8. Authorised approver reviews the supporting evidence and approves or declines.
9. System generates the agreement and schedule.
10. Borrower reviews and accepts electronically, or staff records a valid in-person signing process.
11. Tenant records disbursement only after funds have actually been sent outside the platform.
12. Loan becomes active.
13. Repayments are recorded after the lender confirms receipt.
14. System allocates payment according to the locked allocation policy.
15. Receipts and updated statements are generated.
16. On full settlement, system issues a settlement confirmation and prompts collateral release workflow.

### 11.4 No automated credit decisioning at launch

The platform may calculate affordability ratios and display lender-defined criteria, but it must not automatically approve or decline a borrower.

Any future automated scoring requires:

- legal review;
- data-protection impact assessment;
- explainability;
- human review;
- versioned model governance;
- borrower notice and appeal process.

---

## 12. Disbursement and repayment records

### 12.1 Disbursement

The platform records a disbursement made by the lender outside the SaaS.

Required evidence:

- amount;
- date;
- method;
- provider;
- external reference;
- proof document;
- recorded by;
- verified by;
- verification timestamp.

A loan cannot become active until the disbursement is verified by an authorised tenant user.

### 12.2 Repayments

At launch, repayments are recorded manually by authorised tenant staff after actual receipt.

Required fields:

- loan;
- payer;
- amount;
- payment date;
- method;
- external reference;
- received-by account or till;
- evidence;
- recorded by;
- verified by;
- status.

Statuses:

```text
draft
pending_verification
confirmed
reversed
rejected
```

Only confirmed repayments affect balances.

### 12.3 Immutable financial ledger

Use append-only transaction tables.

Never edit or delete confirmed financial events. Use reversal transactions linked to the original.

Suggested transaction types:

```text
principal_disbursed
principal_repaid
interest_due
interest_paid
fee_due
fee_paid
default_interest_due
default_interest_paid
adjustment
write_off
reversal
```

The balance calculator must be deterministic and covered by unit tests.

### 12.4 Allocation

The tenant configures a lawful allocation policy, versioned and disclosed. The platform applies the locked policy consistently.

Do not change the allocation policy for an existing loan without a formal restructure and audit event.

---

## 13. Repayment schedule and delinquency

### 13.1 Frequencies

Support:

- weekly;
- fortnightly;
- monthly;
- custom dated instalments.

Account for real calendar dates and avoid timezone drift.

### 13.2 Due status

Calculate:

- due today;
- upcoming;
- partially paid;
- overdue;
- days past due;
- outstanding principal;
- outstanding interest;
- outstanding fees;
- total outstanding.

### 13.3 Portfolio quality

Calculate and display:

- active portfolio;
- outstanding principal;
- overdue amount;
- repayment rate;
- arrears aging;
- PAR 1;
- PAR 7;
- PAR 30;
- PAR 60;
- PAR 90;
- settled loans;
- written-off loans.

Define each metric in an in-app glossary and in tests.

---

## 14. Collateral register

### 14.1 Platform scope

The system records collateral information and documents only.

EZER-X never:

- receives physical collateral;
- values collateral;
- verifies title;
- stores collateral;
- directs repossession;
- sells collateral;
- distributes sale proceeds.

### 14.2 Collateral fields

- collateral type;
- description;
- make/model;
- serial, chassis or registration number;
- ownership evidence;
- declared value;
- valuation source and date;
- existing claims;
- condition report;
- photos;
- custody status;
- physical storage location controlled by lender;
- custody receipt;
- linked security agreement;
- registry reference where applicable;
- release details.

Statuses:

```text
proposed
verified_by_lender
pledged
in_lender_custody
release_pending
released
enforcement_review
disposed_by_lender
cancelled
```

### 14.3 Enforcement guardrail

No status change to `disposed_by_lender` without:

- authorised lender approver;
- recorded legal basis;
- notices and dates;
- uploaded evidence;
- disposal details;
- sale proceeds;
- application of proceeds;
- surplus returned;
- audit entry.

The system records what the lender reports. It does not validate that the enforcement was legally correct.

---

## 15. Email notifications with Resend

### 15.1 Initial channels

Launch with email.

WhatsApp remains a future module and must not be simulated or represented as active.

### 15.2 Resend integration

Use Resend from a server-side Edge Function.

Requirements:

- verified EZER-X sending domain for platform billing emails;
- tenant-branded sender name;
- approved reply-to address;
- safe email templates compatible with common desktop and mobile clients;
- idempotency keys for every send;
- delivery, bounce and complaint webhooks;
- durable email outbox;
- retry policy;
- visible failures;
- no silent failure;
- audit link to the related tenant, borrower, loan, document or subscription;
- no secrets in client code.

### 15.3 Notification types

Platform:

- account verification;
- compliance submission received;
- more information requested;
- verification approved/rejected/suspended;
- subscription invoice;
- payment pending;
- payment confirmed;
- subscription receipt;
- renewal reminder;
- payment failure;
- grace-period warning;
- licence-expiry alert;
- security notification.

Tenant-to-borrower:

- application acknowledgement;
- information request;
- application decision;
- agreement ready;
- agreement accepted;
- disbursement confirmation;
- upcoming instalment;
- due today;
- overdue reminder;
- repayment receipt;
- statement;
- settlement confirmation;
- collateral release confirmation.

### 15.4 Reminder guardrails

Reminder schedules are tenant-configured within platform limits.

Messages must:

- identify the lender;
- state the loan/account reference safely;
- state amount and due date;
- provide a contact route;
- use neutral language;
- avoid public exposure, threats or false claims;
- avoid including full NRC or sensitive collateral details;
- respect communication preferences and lawful restrictions.

Record each send, recipient, template version, status and provider message ID.

---

## 16. Analytics and profitability

### 16.1 Tenant dashboard

Show:

- applications by status;
- approval and decline rates;
- disbursements;
- principal outstanding;
- expected interest;
- realised interest;
- fees received;
- cash collected;
- arrears;
- PAR metrics;
- upcoming repayments;
- branch and officer performance;
- collateral summary;
- monthly portfolio movement.

### 16.2 Meaning of “money earned”

Do not show expected future interest as realised profit.

Separate:

- principal disbursed;
- principal recovered;
- interest accrued;
- interest received;
- fees accrued;
- fees received;
- write-offs;
- reversals;
- net realised lending income.

Provide date filters and downloadable reports.

### 16.3 Platform analytics

EZER-X sees only SaaS business metrics by default:

- subscriptions;
- recurring revenue;
- invoice collection;
- churn;
- plan usage;
- support and system health.

Cross-tenant borrower or loan analytics should be disabled unless data is lawfully anonymised, contractually permitted and approved through a data-protection review.

---

## 17. Database blueprint

This is the minimum logical model. Codex may refine names but must preserve boundaries.

### 17.1 Platform and identity

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
branches
support_cases
support_access_grants
audit_events
```

### 17.2 Compliance

```text
tenant_verification_profiles
tenant_licences
tenant_licence_documents
verification_reviews
verification_decisions
compliance_declarations
legal_document_versions
legal_acceptances
regulatory_rule_sets
regulatory_rules
regulatory_rule_versions
```

### 17.3 Subscription billing

```text
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
```

### 17.4 Branding and templates

```text
tenant_branding
tenant_document_settings
document_sequences
document_templates
document_template_versions
generated_documents
email_templates
email_template_versions
```

### 17.5 Borrowers and applications

```text
borrowers
borrower_addresses
borrower_contacts
borrower_consents
borrower_documents
borrower_employment
borrower_income_sources
employment_verifications
income_document_periods
financial_document_reviews
affordability_assessments
borrower_businesses
loan_products
loan_product_versions
loan_applications
application_documents
application_assessments
application_decisions
```

### 17.6 Loans

```text
loans
loan_terms
loan_calculation_versions
loan_schedules
loan_schedule_items
loan_disbursements
loan_transactions
loan_repayments
loan_repayment_allocations
loan_adjustments
loan_restructures
loan_status_history
loan_promises_to_pay
```

### 17.7 Collateral

```text
collateral
collateral_documents
collateral_valuations
collateral_custody_events
collateral_enforcement_reviews
collateral_disposals
collateral_release_events
```

### 17.8 Communications and operations

```text
notification_preferences
notification_rules
notification_jobs
email_outbox
email_messages
email_webhook_events
job_runs
integration_logs
incident_register
data_subject_requests
data_exports
```

### 17.9 Required database conventions

Every business table includes as appropriate:

```text
id uuid primary key
tenant_id uuid
created_at timestamptz
created_by uuid
updated_at timestamptz
updated_by uuid
version integer
status text or enum
```

Financial and legal records also include:

```text
confirmed_at
confirmed_by
reversed_at
reversed_by
reversal_reason
source_snapshot jsonb
```

Use foreign keys, unique constraints, check constraints and indexes. Do not depend on application code alone for integrity.

---

## 18. Audit and evidence

### 18.1 Audit events

Record:

- authentication and MFA changes;
- role and permission changes;
- support access;
- verification decisions;
- licence changes;
- plan and pricing changes;
- subscription changes;
- payment webhook processing;
- borrower record access where sensitive;
- application decisions;
- loan term changes;
- agreement generation and acceptance;
- disbursement and repayment confirmation;
- reversals;
- collateral status changes;
- document downloads;
- reminder sends;
- data exports and deletion requests.

### 18.2 Audit properties

Audit records must be append-only and contain:

- actor;
- actor role;
- tenant;
- action;
- entity type;
- entity ID;
- before and after summaries where safe;
- IP address;
- user agent;
- timestamp;
- reason;
- correlation ID.

Do not store API secrets, full passwords or unnecessary full identity values in audit payloads.

---

## 19. Data protection

### 19.1 Controller and processor model

Normally:

- the lender is the data controller for borrower data;
- EZER-X is the data processor for tenant-controlled borrower data;
- EZER-X is the data controller for its own tenant accounts, SaaS billing, platform security and support records.

The platform must support this distinction in privacy notices, agreements and data-subject workflows.

### 19.2 Required controls

- DPC registration workflow and launch checklist;
- record of processing activities;
- lawful-purpose and consent records;
- data minimisation;
- role-based access;
- encryption in transit;
- secure storage;
- tenant isolation;
- retention rules;
- data export;
- rectification request workflow;
- restriction and deletion request workflow;
- legal hold;
- subprocessor register;
- cross-border transfer inventory;
- breach and incident register;
- security review schedule.

### 19.3 Security incident clock

Create an incident workflow that records:

- detection time;
- affected systems and tenants;
- personal data categories;
- risk assessment;
- containment;
- processor-to-controller notice;
- regulator notice decision;
- borrower notice decision;
- timestamps;
- evidence;
- closure and lessons.

Include a visible 24-hour regulatory response clock for incidents involving personal data, subject to final legal configuration.

### 19.4 Data retention

Retention must be configurable by record category and legal basis.

Do not automatically delete active loan, payment, agreement, audit or dispute records merely because a borrower closes portal access.

Use scheduled deletion only after:

- retention period expires;
- no active loan;
- no unresolved dispute;
- no legal hold;
- authorised approval;
- audit record.

---

## 20. Security requirements

- MFA mandatory for platform admins.
- MFA required for tenant owners, administrators, approvers and users who confirm money records.
- Rate-limit authentication, public application and document endpoints.
- Use CAPTCHA or equivalent abuse protection on public forms.
- Validate file type, content signature and size.
- Use private storage buckets.
- Use short-lived signed URLs.
- Never expose Supabase service-role key, Lenco token or Resend key to the browser.
- Store secrets only in Supabase/Netlify environment variables.
- Use CSRF-safe patterns for state-changing server actions.
- Apply secure headers and Content Security Policy.
- Mask sensitive data in logs.
- Rotate keys and document the process.
- Back up the database and test restoration.
- Create branch-protection rules and mandatory CI.
- Run dependency and secret scanning.
- Use least privilege for database and platform staff.
- Prevent export abuse with permission checks, logging and limits.
- Provide session revocation and device/session view.
- Add inactivity timeout for privileged roles.
- Do not implement unsafe generic SQL, HTML or template execution.

---

## 21. Production quality rules

1. No fictional borrower, lender, loan or payment data in production.
2. No visible “demo”, “sample”, “trial” or fake transaction mode in production.
3. Automated tests may use isolated synthetic fixtures that are never deployed to production.
4. Development and staging must use separate Supabase projects and Lenco sandbox credentials.
5. Production uses live Lenco and verified Resend configuration.
6. No feature may show success before the server confirms success.
7. No API or background failure may fail silently.
8. Every background job has status, attempts, last error and retry control.
9. Confirmed financial records are immutable.
10. Every external integration is idempotent.
11. Every tenant table has tested RLS.
12. Every legal document is versioned and reproducible.
13. Every destructive action requires confirmation and audit.
14. No TODO placeholder may remain on a launch-critical path.
15. Credentials are never committed.
16. Database migrations are the source of truth.
17. Production seed scripts create only required configuration and the first authorised platform admin; they create no fake business records.

---

## 21A. Mandatory lessons learned and release safeguards

The repository must contain `docs/lessons-learned.md`, based on `LOAN_SAAS_ENGINEERING_LESSONS_AND_RELEASE_RULES.md` supplied with this build pack. It is a binding engineering document, not optional background reading.

Codex must read it before implementing features. Each applicable historical failure must be prevented through code, migrations, permissions, tests, release checks or monitored operational states.

### 21A.1 Required safeguards carried into this product

1. **Protected Next.js routes:** Authenticated operations, lender, borrower and billing pages must not be accidentally prerendered. Use runtime rendering where required and never read sessions, cookies or runtime secrets at module scope.
2. **Correct Netlify model:** Treat the product as a Next.js App Router server application, not a static SPA. Do not add a catch-all redirect to `index.html`.
3. **Deterministic CI:** Keep normal CI independent of unavailable live services. Run provider and browser integration tests only against dedicated non-production Supabase, Lenco and Resend environments.
4. **Authentication coverage:** Test first-time and returning users separately, including invalid, expired and resent OTPs or links. Authentication templates and redirect configuration are release-controlled settings.
5. **Identity separation:** A Supabase Auth user is separate from a platform user, tenant membership and borrower record. Linking must support either creation order, normalize email and remain tenant-scoped.
6. **Relational journey tests:** Test the full chain from both lender and borrower interfaces. Successful creation in one workspace does not prove visibility or eligibility in the other.
7. **Consistent dashboard and action filters:** Badge counts, destination lists, details and mutations must use the same tenant, branch, role and status definitions.
8. **Safe structured errors:** Unexpected database and provider errors produce server evidence and a safe user support reference. They must never become misleading empty states.
9. **Truthful notification states:** Keep queued, processing, sent, delivered, failed and requires-review separate. Do not mark unconfigured Resend or future WhatsApp notifications as successful.
10. **Three-layer access enforcement:** Licence and subscription restrictions apply at route entry, database/domain boundary and user-facing status. Hiding menus is insufficient.
11. **Safe PostgreSQL functions and migrations:** Prefix function parameters, qualify columns, run Supabase database lint and use forward-only corrective migrations.
12. **No fictional production paths:** Production source must not contain demo records, simulated payments, fictional fallbacks or fake success states.

### 21A.2 Mandatory project release command

Create:

```bash
pnpm release:check
```

It must execute:

- production-integrity and no-fictional-data checks;
- JSX structure and component-resolution checks;
- unit and component tests;
- ESLint;
- strict TypeScript checking;
- optimized Next.js production build.

The command used in GitHub Actions and later by Netlify must be the same release command that passes locally.

For database changes also run:

```bash
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db push --linked
pnpm exec supabase db lint --linked --level error --fail-on error
```

Never push or deploy while a required check fails. Never disable a check, weaken authorization or add fake data to make the build green.

### 21A.3 Required automated protections

At minimum, implement:

- a production-source integrity scanner;
- a JSX structure scanner or equivalent build-time protection;
- two-tenant RLS access and denial tests;
- composite tenant-relationship integrity tests;
- subscription and licence access tests at route and database boundaries;
- Lenco signature, replay, amount and idempotency tests;
- Resend state-transition and provider-unavailable tests;
- first-time and returning authentication tests;
- count/list/detail/action reconciliation tests for operational queues;
- atomic subscription-payment and borrower-repayment transaction tests;
- migration dry-run and remote database lint in the release workflow;
- structured error and correlation-reference tests;
- optimized production build from a clean checkout.

### 21A.4 Incident-driven maintenance

Any production, staging, security, cross-tenant, payment, authentication, data-integrity, notification or deployment failure must update `docs/lessons-learned.md` in the same change that fixes it. The incident entry must record the symptom, root cause, fix, prevention rule, automated protection and relevant commit or migration.

---

## 22. User experience

### 22.1 Design direction

- clean, premium and trustworthy;
- light theme;
- mobile-first;
- accessible colour contrast;
- clear Zambian context;
- ZMW formatting;
- Africa/Lusaka dates;
- simple language;
- no crowded dashboards;
- useful empty states that explain the next real action without inserting fake data;
- clear separation between platform billing and tenant loan operations.

### 22.2 Tenant navigation

Suggested navigation:

```text
Dashboard
Applications
Clients
Loans
Repayments
Collections
Collateral
Documents
Reports
Branches
Team
Settings
Subscription
Support
```

### 22.3 Operations navigation

```text
Overview
Tenant Applications
Verified Tenants
Licences
Plans & Pricing
Subscriptions
Invoices
Lenco Payments
Reconciliation
Email Delivery
Support
Incidents
Audit
Platform Settings
```

### 22.4 Required banners

Show a clear banner when:

- verification is pending;
- more information is required;
- licence is expiring;
- licence is expired;
- subscription payment is pending;
- account is in grace period;
- account is read-only;
- support access is active;
- an integration is degraded.

---

## 23. Reports and exports

Tenant reports:

- borrower register;
- application register;
- approval/decline report;
- disbursement register;
- repayment register;
- outstanding loan report;
- arrears aging;
- PAR report;
- interest and fee income;
- loan officer portfolio;
- branch performance;
- collateral register;
- settled loans;
- written-off loans;
- communication log;
- audit report.

Exports:

- CSV and Excel for operational reports;
- PDF for official statements;
- background generation for large exports;
- visible status and failure;
- tenant watermark and metadata;
- permission and audit checks.

Do not allow cross-tenant exports.

---

## 24. API and background-job design

### 24.1 Integration pattern

Use:

- signed webhook endpoints;
- idempotency keys;
- unique database constraints;
- raw-event storage with hashes;
- durable outbox;
- retry with backoff;
- dead-letter status;
- manual replay by authorised platform users;
- correlation IDs;
- structured logs.

### 24.2 Scheduled jobs

At minimum:

- subscription renewal reminders;
- unpaid subscription invoice follow-up;
- Lenco status polling;
- licence-expiry checks;
- borrower instalment reminders;
- overdue reminders;
- email retries;
- document expiry checks;
- stale application checks;
- job-health monitoring.

Each job run stores:

```text
job_name
scheduled_for
started_at
completed_at
status
records_considered
records_succeeded
records_failed
last_error
correlation_id
```

---

## 25. Testing requirements

### 25.1 Unit tests

- flat simple-interest calculation;
- declining-balance simple-interest calculation;
- schedule generation;
- annual rate disclosure;
- money rounding in minor units;
- payment allocation;
- balance calculation;
- arrears and days-past-due;
- PAR metrics;
- subscription entitlement calculation;
- licence and subscription gates;
- document numbering;
- regulatory rule evaluation;
- phone normalisation;
- three-month payslip and statement completeness checks;
- average accepted net-income calculation;
- debt-service and disposable-income calculations.

### 25.2 Database tests

- tenant A cannot access tenant B rows;
- branch scope works;
- role permissions work;
- suspended users are blocked;
- unverified tenant cannot create live loans;
- expired licence blocks configured actions;
- confirmed transactions cannot be edited or deleted;
- duplicate webhook cannot double-activate a subscription;
- duplicate repayment cannot double-credit a loan;
- storage RLS blocks cross-tenant files.

### 25.3 Integration tests

- Lenco mobile-money collection request;
- signature verification;
- pending/pay-offline handling;
- successful webhook;
- failed webhook;
- re-query fallback;
- duplicate event;
- amount/reference mismatch;
- Resend send and idempotency;
- email delivery/bounce webhook;
- scheduled retry.

### 25.4 End-to-end tests

- tenant applies and uploads licence;
- compliance approves;
- tenant pays subscription;
- subscription activates;
- tenant sets branding and users;
- employed borrower applies;
- borrower uploads three distinct monthly payslips and three months of bank statements;
- system identifies any missing or duplicate period;
- loan officer accepts the evidence, records employment verification and reviews affordability;
- approver approves;
- borrower accepts agreement;
- lender records disbursement;
- lender records and verifies repayment;
- receipt and statement are generated;
- overdue reminder is queued;
- loan settles and collateral release is recorded.

---

## 26. Deployment and environments

### 26.1 Environments

Use separate:

```text
local
staging
production
```

Each environment has separate:

- Supabase project;
- database;
- storage;
- auth configuration;
- Lenco credentials;
- Resend configuration;
- webhook URL;
- application URL;
- encryption and signing secrets.

### 26.2 Deployment

- GitHub private repository;
- Netlify deploy previews for pull requests;
- production deployment from protected main branch;
- Supabase migrations applied through controlled CI or documented release step;
- Edge Functions deployed separately;
- production webhook endpoints registered with Lenco and Resend;
- database backup and rollback plan documented;
- release checklist completed before enabling real tenant operations.

### 26.3 Environment variables

Minimum expected variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
LENCO_API_BASE_URL
LENCO_API_TOKEN
LENCO_WEBHOOK_SECRET_DERIVATION_MODE
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_REPLY_TO
RESEND_WEBHOOK_SECRET
APP_NAME
APP_ENV
CRON_SECRET
DOCUMENT_SIGNING_SECRET
SUPPORT_ACCESS_SECRET
```

Never put server secrets in variables prefixed with `NEXT_PUBLIC_`.

---

## 26A. GitHub repository and source-control workflow

The official GitHub owner is:

```text
lenny105
```

The intended private repository is:

```text
lenny105/zambia-loan-management-saas
```

Codex must:

1. Check whether GitHub CLI is installed and authenticated to the `lenny105` account.
2. Create the repository as **private** if it does not already exist.
3. Initialise Git in the project folder if required.
4. Use `main` as the default branch.
5. Add an appropriate `.gitignore` before the first commit.
6. Confirm that no environment files, API keys, tokens, service-role keys or private documents are staged.
7. Commit the production foundation using clear conventional commit messages.
8. Add the GitHub repository as `origin`.
9. Push the `main` branch to `lenny105/zambia-loan-management-saas`.
10. Push each completed, tested vertical slice after its checks pass.
11. Never force-push to `main`.
12. Never commit `.env`, `.env.local`, Supabase service keys, Lenco credentials, Resend credentials, webhook secrets or production borrower files.
13. Add GitHub Actions for linting, type-checking, tests, build and migration validation.
14. Configure branch protection when repository permissions allow it.
15. Do not connect or deploy the application to Netlify yet. Netlify connection will be done later when the product has made substantial progress and is close to launch.

If GitHub CLI is not authenticated, Codex should complete all local repository work and provide the exact authentication command required. It must not invent credentials or expose tokens.

---

## 27. Build phases

### Phase 0 — Repository and foundation

Deliver:

- Next.js TypeScript application;
- pnpm;
- Tailwind and component system;
- environment validation;
- Supabase clients;
- CI;
- linting, type-checking and tests;
- application shell;
- error handling;
- structured logs;
- database migration framework;
- no fake production data.

### Phase 1 — Identity, tenants and compliance

Deliver:

- authentication;
- MFA for platform roles;
- platform and tenant roles;
- tenant onboarding;
- licence uploads;
- compliance review console;
- approval/suspension/expiry gates;
- audit log;
- tested RLS and storage policies.

### Phase 2 — Plans, subscription billing and Lenco

Deliver:

- plan and price management;
- monthly/annual subscription selection;
- invoice generation;
- Lenco mobile-money collection;
- verified webhook processing;
- 30-minute status poll fallback;
- activation, renewal, grace and suspension;
- EZER-X invoices and receipts;
- finance and reconciliation console.

### Phase 3 — Tenant setup and branding

Deliver:

- branches;
- team and permissions;
- branding;
- document sequences;
- email templates;
- lender-branded borrower application page;
- white-label tenant interface.

### Phase 4 — Clients and applications

Deliver:

- borrower records;
- employment and income profiles;
- private payslip, bank-statement and mobile-money-statement uploads;
- configurable three-month document requirements by applicant type and loan product;
- document-period completeness checks and lender review statuses;
- employment verification records;
- average net-income and affordability calculations from lender-accepted figures;
- public and staff-assisted applications;
- duplicate checks;
- consent and privacy records;
- assessment workflow;
- human decision workflow.

### Phase 5 — Loan engine and documents

Deliver:

- versioned loan products;
- simple-interest calculators;
- repayment schedules;
- regulatory rule engine;
- agreements;
- borrower acceptance;
- disbursement recording;
- loan activation.

### Phase 6 — Repayments, statements and collateral

Deliver:

- repayment verification;
- append-only ledger;
- receipts;
- statements;
- balances;
- collateral register;
- custody and release records;
- enforcement guardrails.

### Phase 7 — Notifications and analytics

Deliver:

- Resend outbox;
- transactional templates;
- due and overdue reminders;
- delivery tracking;
- portfolio dashboards;
- PAR and income reports;
- exports.

### Phase 8 — Hardening and launch

Deliver:

- full security review;
- RLS test suite;
- load tests;
- backup and restoration test;
- incident runbook;
- privacy and legal launch documents;
- production Lenco and Resend verification;
- monitoring;
- launch checklist;
- first verified tenant activation.

---

## 28. Definition of done

The product is launch-ready only when:

- a lender cannot operate before compliance approval;
- subscription activation is tied to verified Lenco success;
- no borrower money touches the EZER-X subscription account;
- every tenant record is isolated through tested RLS;
- every borrower file is private;
- the lender controls products and terms;
- the system does not support compound interest;
- agreements disclose the full repayment terms;
- confirmed financial records are immutable;
- reminders are logged and non-threatening;
- collateral enforcement is never automatic;
- branded documents are versioned and reproducible;
- platform and tenant revenue are clearly separated;
- all critical jobs expose failures;
- no fake production data exists;
- legal and privacy documents are approved;
- production credentials and webhooks are live;
- an end-to-end real tenant workflow passes successfully.

---

## 29. Source references used for this baseline

Review these again before launch because laws, commencement status and provider APIs can change.

- National Assembly of Zambia — Money-Lenders Act, Chapter 398  
  https://www.parliament.gov.zm/sites/default/files/documents/acts/Money-lenders%20Act.pdf
- National Assembly of Zambia — Banking and Financial Services Act No. 9 of 2026  
  https://www.parliament.gov.zm/sites/default/files/documents/acts/Banking%20and%20Finance%20Act%2C%202026.pdf
- ZambiaLII — Banking and Financial Services Act, 2026 status  
  https://zambialii.org/akn/zm/act/2026/9/eng@2026-04-08
- National Assembly of Zambia — Data Protection Act No. 3 of 2021  
  https://www.parliament.gov.zm/sites/default/files/documents/acts/Act%20No.%203%20The%20Data%20Protection%20Act%202021_0.pdf
- Data Protection Commission Zambia — registration guidance  
  https://www.dataprotection.gov.zm/registration/
- National Assembly of Zambia — Electronic Communications and Transactions Act, 2021  
  https://www.parliament.gov.zm/node/8842
- Lenco API v2 — mobile-money collections and webhooks  
  https://lenco-api.readme.io/v2.0/reference/initiate-collection-from-mobile-money  
  https://lenco-api.readme.io/v2.0/reference/webhooks
- Resend — email API, idempotency and webhooks  
  https://resend.com/docs/api-reference/emails/send-email  
  https://resend.com/docs/dashboard/emails/idempotency-keys  
  https://resend.com/docs/webhooks/introduction
- Supabase — Row Level Security and Storage access control  
  https://supabase.com/docs/guides/database/postgres/row-level-security  
  https://supabase.com/docs/guides/storage/security/access-control

---

## 30. Final product principle

This SaaS helps a verified lender administer its own lending business. It must never blur the boundary between providing software and providing, arranging, funding, pricing, collecting or enforcing a loan.
