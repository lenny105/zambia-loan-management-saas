begin;

create type public.application_status as enum ('draft','submitted','under_review','needs_information','approved','rejected','withdrawn','expired');
create type public.loan_status as enum ('pending_agreement','approved','disbursed','active','past_due','settled','written_off','cancelled');
create type public.document_review_status as enum ('uploaded','accepted','rejected','waived');

create table public.lender_public_profiles (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  slug text not null unique check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  public_name text not null,
  summary text,
  service_areas text[] not null default '{}',
  support_email text,
  support_phone text,
  complaints_email text,
  privacy_url text,
  terms_url text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.loan_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  min_amount_minor bigint not null check(min_amount_minor > 0),
  max_amount_minor bigint not null check(max_amount_minor >= min_amount_minor),
  min_term_months int not null check(min_term_months > 0),
  max_term_months int not null check(max_term_months >= min_term_months),
  annual_interest_rate_bps int not null check(annual_interest_rate_bps >= 0),
  application_fee_minor bigint not null default 0 check(application_fee_minor >= 0),
  applicant_categories text[] not null default array['employed'],
  required_payslip_months int not null default 3 check(required_payslip_months between 0 and 12),
  required_statement_months int not null default 3 check(required_statement_months between 0 and 12),
  published boolean not null default false,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code)
);

create table public.borrowers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  nrc_number text,
  phone_e164 text not null,
  residential_address text not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,profile_id),
  unique(tenant_id,nrc_number)
);

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  borrower_id uuid not null references public.borrowers(id) on delete restrict,
  product_id uuid not null references public.loan_products(id) on delete restrict,
  requested_amount_minor bigint not null check(requested_amount_minor > 0),
  requested_term_months int not null check(requested_term_months > 0),
  purpose text not null,
  applicant_category text not null,
  status public.application_status not null default 'draft',
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.borrower_employment (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  borrower_id uuid not null references public.borrowers(id) on delete cascade, application_id uuid not null references public.loan_applications(id) on delete cascade,
  employment_type text not null, employer_name text, job_title text, started_on date, gross_monthly_minor bigint check(gross_monthly_minor >= 0),
  net_monthly_minor bigint check(net_monthly_minor >= 0), created_at timestamptz not null default now(), unique(application_id)
);

create table public.borrower_income_sources (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  borrower_id uuid not null references public.borrowers(id) on delete cascade, application_id uuid not null references public.loan_applications(id) on delete cascade,
  source_type text not null, description text not null, monthly_amount_minor bigint not null check(monthly_amount_minor >= 0),
  lender_accepted_amount_minor bigint check(lender_accepted_amount_minor >= 0), reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid not null references public.loan_applications(id) on delete cascade, borrower_id uuid not null references public.borrowers(id) on delete cascade,
  document_type text not null, period_month date, storage_path text not null unique, file_hash text not null,
  review_status public.document_review_status not null default 'uploaded', review_reason text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
  uploaded_at timestamptz not null default now(), unique(application_id,document_type,period_month,file_hash)
);

create table public.financial_document_reviews (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.application_documents(id) on delete cascade, decision public.document_review_status not null,
  reason text not null, reviewed_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

create table public.affordability_assessments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid not null references public.loan_applications(id) on delete cascade, accepted_net_income_minor bigint not null check(accepted_net_income_minor >= 0),
  declared_obligations_minor bigint not null check(declared_obligations_minor >= 0), proposed_instalment_minor bigint not null check(proposed_instalment_minor >= 0),
  disposable_income_minor bigint not null, debt_service_ratio_bps int, assessed_by uuid not null references public.profiles(id), notes text not null,
  created_at timestamptz not null default now()
);

create table public.application_decisions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid not null references public.loan_applications(id) on delete cascade, decision text not null check(decision in('approve','reject','request_information')),
  reason text not null, decided_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

create table public.loan_agreements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid not null unique references public.loan_applications(id) on delete restrict, version int not null default 1,
  principal_minor bigint not null check(principal_minor > 0), total_interest_minor bigint not null check(total_interest_minor >= 0), total_fees_minor bigint not null check(total_fees_minor >= 0),
  term_months int not null check(term_months > 0), content_hash text not null, terms_snapshot jsonb not null, storage_path text, document_hash text, accepted_at timestamptz, accepted_ip inet, created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid not null unique references public.loan_applications(id) on delete restrict, borrower_id uuid not null references public.borrowers(id) on delete restrict,
  agreement_id uuid not null unique references public.loan_agreements(id) on delete restrict, account_number text not null,
  principal_minor bigint not null check(principal_minor > 0), annual_interest_rate_bps int not null check(annual_interest_rate_bps >= 0),
  term_months int not null check(term_months > 0), status public.loan_status not null default 'pending_agreement', disbursed_at timestamptz, created_at timestamptz not null default now(),
  unique(tenant_id,account_number)
);

create table public.loan_disbursements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete restrict, amount_minor bigint not null check(amount_minor > 0), method text not null,
  external_reference text not null, recorded_by uuid not null references public.profiles(id), disbursed_at timestamptz not null, created_at timestamptz not null default now(), unique(tenant_id,external_reference)
);

create table public.loan_instalments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade, instalment_number int not null check(instalment_number > 0), due_date date not null,
  principal_minor bigint not null check(principal_minor >= 0), interest_minor bigint not null check(interest_minor >= 0), fees_minor bigint not null default 0 check(fees_minor >= 0),
  paid_minor bigint not null default 0 check(paid_minor >= 0), unique(loan_id,instalment_number)
);

create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete restrict, amount_minor bigint not null check(amount_minor > 0), method text not null,
  external_reference text not null, received_at timestamptz not null, recorded_by uuid not null references public.profiles(id), reversed_at timestamptz, reversal_reason text,
  created_at timestamptz not null default now(), unique(tenant_id,external_reference)
);

create table public.repayment_allocations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  repayment_id uuid not null references public.loan_repayments(id) on delete restrict, instalment_id uuid not null references public.loan_instalments(id) on delete restrict,
  amount_minor bigint not null check(amount_minor > 0), created_at timestamptz not null default now(), unique(repayment_id,instalment_id)
);

create table public.loan_repayment_receipts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  repayment_id uuid not null unique references public.loan_repayments(id) on delete restrict, receipt_number text not null,
  amount_minor bigint not null check(amount_minor > 0), document_path text, document_hash text, created_at timestamptz not null default now(), unique(tenant_id,receipt_number)
);

create table public.repayment_adjustments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  repayment_id uuid not null references public.loan_repayments(id) on delete restrict, adjustment_type text not null check(adjustment_type in('reversal','correction')),
  amount_minor bigint not null check(amount_minor > 0), reason text not null, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

create table public.loan_statement_exports (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete restrict, as_of_date date not null, storage_path text not null, document_hash text not null,
  generated_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), unique(loan_id,as_of_date,document_hash)
);

create table public.borrower_complaints (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  borrower_id uuid not null references public.borrowers(id) on delete cascade, subject text not null, description text not null,
  status text not null default 'open' check(status in('open','acknowledged','investigating','resolved','closed')),
  resolution text, created_at timestamptz not null default now(), resolved_at timestamptz
);

alter table public.loan_products add constraint loan_products_id_tenant_unique unique(id,tenant_id);
alter table public.borrowers add constraint borrowers_id_tenant_unique unique(id,tenant_id);
alter table public.loan_applications add constraint applications_id_tenant_unique unique(id,tenant_id), add constraint applications_identity_unique unique(id,borrower_id,tenant_id),
  add constraint applications_borrower_tenant_fk foreign key(borrower_id,tenant_id) references public.borrowers(id,tenant_id),
  add constraint applications_product_tenant_fk foreign key(product_id,tenant_id) references public.loan_products(id,tenant_id);
alter table public.borrower_employment add constraint employment_application_identity_fk foreign key(application_id,borrower_id,tenant_id) references public.loan_applications(id,borrower_id,tenant_id);
alter table public.borrower_income_sources add constraint income_application_identity_fk foreign key(application_id,borrower_id,tenant_id) references public.loan_applications(id,borrower_id,tenant_id);
alter table public.application_documents add constraint documents_id_tenant_unique unique(id,tenant_id), add constraint documents_application_identity_fk foreign key(application_id,borrower_id,tenant_id) references public.loan_applications(id,borrower_id,tenant_id);
alter table public.financial_document_reviews add constraint reviews_document_tenant_fk foreign key(document_id,tenant_id) references public.application_documents(id,tenant_id);
alter table public.affordability_assessments add constraint assessments_application_tenant_fk foreign key(application_id,tenant_id) references public.loan_applications(id,tenant_id);
alter table public.application_decisions add constraint decisions_application_tenant_fk foreign key(application_id,tenant_id) references public.loan_applications(id,tenant_id);
alter table public.loan_agreements add constraint agreements_id_tenant_unique unique(id,tenant_id), add constraint agreements_application_tenant_fk foreign key(application_id,tenant_id) references public.loan_applications(id,tenant_id);
alter table public.loans add constraint loans_id_tenant_unique unique(id,tenant_id), add constraint loans_application_identity_fk foreign key(application_id,borrower_id,tenant_id) references public.loan_applications(id,borrower_id,tenant_id), add constraint loans_agreement_tenant_fk foreign key(agreement_id,tenant_id) references public.loan_agreements(id,tenant_id);
alter table public.loan_disbursements add constraint disbursements_loan_tenant_fk foreign key(loan_id,tenant_id) references public.loans(id,tenant_id);
alter table public.loan_instalments add constraint instalments_loan_tenant_fk foreign key(loan_id,tenant_id) references public.loans(id,tenant_id);
alter table public.loan_repayments add constraint repayments_loan_tenant_fk foreign key(loan_id,tenant_id) references public.loans(id,tenant_id);
alter table public.loan_repayments add constraint repayments_id_tenant_unique unique(id,tenant_id);
alter table public.loan_instalments add constraint instalments_id_tenant_unique unique(id,tenant_id);
alter table public.repayment_allocations add constraint allocations_repayment_tenant_fk foreign key(repayment_id,tenant_id) references public.loan_repayments(id,tenant_id), add constraint allocations_instalment_tenant_fk foreign key(instalment_id,tenant_id) references public.loan_instalments(id,tenant_id);
alter table public.loan_repayment_receipts add constraint loan_receipts_repayment_tenant_fk foreign key(repayment_id,tenant_id) references public.loan_repayments(id,tenant_id);
alter table public.repayment_adjustments add constraint repayment_adjustments_repayment_tenant_fk foreign key(repayment_id,tenant_id) references public.loan_repayments(id,tenant_id);
alter table public.loan_statement_exports add constraint statement_exports_loan_tenant_fk foreign key(loan_id,tenant_id) references public.loans(id,tenant_id);
alter table public.borrower_complaints add constraint complaints_borrower_tenant_fk foreign key(borrower_id,tenant_id) references public.borrowers(id,tenant_id);

do $$ declare n text; begin for n in select unnest(array['lender_public_profiles','loan_products','borrowers','loan_applications','borrower_employment','borrower_income_sources','application_documents','financial_document_reviews','affordability_assessments','application_decisions','loan_agreements','loans','loan_disbursements','loan_instalments','loan_repayments','repayment_allocations','loan_repayment_receipts','repayment_adjustments','loan_statement_exports','borrower_complaints']) loop execute format('alter table public.%I enable row level security',n); end loop; end $$;

create or replace function private.is_borrower(target_borrower uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.borrowers b where b.id=target_borrower and b.profile_id=auth.uid())$$;
revoke all on function private.is_borrower(uuid) from public,anon,authenticated;
grant execute on function private.is_borrower(uuid) to authenticated;
create or replace function private.has_tenant_permission(target_tenant uuid,target_permission text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.tenant_memberships m join public.tenant_role_permissions p on p.role_id=m.role_id where m.tenant_id=target_tenant and m.profile_id=auth.uid() and m.active and p.permission=target_permission)$$;
revoke all on function private.has_tenant_permission(uuid,text) from public,anon,authenticated;
grant execute on function private.has_tenant_permission(uuid,text) to authenticated;

insert into public.tenant_role_permissions(role_id,permission)
select r.id,p.permission from public.tenant_roles r cross join unnest(array['applications.read','applications.review','applications.decide','products.manage','loans.manage','repayments.manage','complaints.manage']) p(permission) where r.code='owner' on conflict do nothing;

create policy lender_profiles_public_read on public.lender_public_profiles for select to anon,authenticated using(published and exists(select 1 from public.tenants t where t.id=tenant_id and t.status='active'));
create policy lender_profiles_staff_all on public.lender_public_profiles for all to authenticated using(private.is_tenant_member(tenant_id) or private.is_platform_user()) with check(private.is_tenant_member(tenant_id) or private.is_platform_user());
create policy products_public_read on public.loan_products for select to anon,authenticated using(published and active and exists(select 1 from public.tenants t where t.id=tenant_id and t.status='active'));
create policy products_staff_all on public.loan_products for all to authenticated using(private.is_tenant_member(tenant_id) or private.is_platform_user()) with check(private.is_tenant_member(tenant_id) and private.tenant_can_operate(tenant_id));
create policy borrowers_scoped on public.borrowers for select to authenticated using(profile_id=auth.uid() or private.is_tenant_member(tenant_id) or private.is_platform_user());
create policy borrowers_self_insert on public.borrowers for insert to authenticated with check(profile_id=auth.uid() and private.tenant_can_operate(tenant_id));
create policy borrowers_self_update on public.borrowers for update to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy applications_scoped_read on public.loan_applications for select to authenticated using(private.is_borrower(borrower_id) or private.is_tenant_member(tenant_id) or private.is_platform_user());
create policy applications_borrower_insert on public.loan_applications for insert to authenticated with check(private.is_borrower(borrower_id) and private.tenant_can_operate(tenant_id) and status='draft' and exists(select 1 from public.loan_products p where p.id=product_id and p.tenant_id=loan_applications.tenant_id and p.active and p.published));

do $$ declare n text; begin for n in select unnest(array['borrower_employment','borrower_income_sources','application_documents','financial_document_reviews','affordability_assessments','application_decisions','loan_agreements','loans','loan_disbursements','loan_instalments','loan_repayments','repayment_allocations','loan_repayment_receipts','repayment_adjustments','loan_statement_exports','borrower_complaints']) loop execute format('create policy %I_staff_read on public.%I for select to authenticated using(private.is_tenant_member(tenant_id) or private.is_platform_user())',n,n); end loop; end $$;

create policy employment_borrower_read on public.borrower_employment for select to authenticated using(private.is_borrower(borrower_id));
create policy income_borrower_read on public.borrower_income_sources for select to authenticated using(private.is_borrower(borrower_id));
create policy documents_borrower_read on public.application_documents for select to authenticated using(private.is_borrower(borrower_id));
create policy reviews_borrower_read on public.financial_document_reviews for select to authenticated using(exists(select 1 from public.application_documents d where d.id=document_id and private.is_borrower(d.borrower_id)));
create policy assessments_borrower_read on public.affordability_assessments for select to authenticated using(exists(select 1 from public.loan_applications a where a.id=application_id and private.is_borrower(a.borrower_id)));
create policy decisions_borrower_read on public.application_decisions for select to authenticated using(exists(select 1 from public.loan_applications a where a.id=application_id and private.is_borrower(a.borrower_id)));
create policy agreements_borrower_read on public.loan_agreements for select to authenticated using(exists(select 1 from public.loan_applications a where a.id=application_id and private.is_borrower(a.borrower_id)));
create policy loans_borrower_read on public.loans for select to authenticated using(private.is_borrower(borrower_id));
create policy disbursements_borrower_read on public.loan_disbursements for select to authenticated using(exists(select 1 from public.loans l where l.id=loan_id and private.is_borrower(l.borrower_id)));
create policy instalments_borrower_read on public.loan_instalments for select to authenticated using(exists(select 1 from public.loans l where l.id=loan_id and private.is_borrower(l.borrower_id)));
create policy repayments_borrower_read on public.loan_repayments for select to authenticated using(exists(select 1 from public.loans l where l.id=loan_id and private.is_borrower(l.borrower_id)));
create policy allocations_borrower_read on public.repayment_allocations for select to authenticated using(exists(select 1 from public.loan_repayments r join public.loans l on l.id=r.loan_id where r.id=repayment_id and private.is_borrower(l.borrower_id)));
create policy loan_receipts_borrower_read on public.loan_repayment_receipts for select to authenticated using(exists(select 1 from public.loan_repayments r join public.loans l on l.id=r.loan_id where r.id=repayment_id and private.is_borrower(l.borrower_id)));
create policy repayment_adjustments_borrower_read on public.repayment_adjustments for select to authenticated using(exists(select 1 from public.loan_repayments r join public.loans l on l.id=r.loan_id where r.id=repayment_id and private.is_borrower(l.borrower_id)));
create policy statement_exports_borrower_read on public.loan_statement_exports for select to authenticated using(exists(select 1 from public.loans l where l.id=loan_id and private.is_borrower(l.borrower_id)));
create policy complaints_borrower_read on public.borrower_complaints for select to authenticated using(private.is_borrower(borrower_id));

create policy employment_borrower_all on public.borrower_employment for all to authenticated using(private.is_borrower(borrower_id)) with check(private.is_borrower(borrower_id));
create policy income_borrower_all on public.borrower_income_sources for all to authenticated using(private.is_borrower(borrower_id)) with check(private.is_borrower(borrower_id));
create policy documents_borrower_insert on public.application_documents for insert to authenticated with check(private.is_borrower(borrower_id));
create policy complaints_borrower_all on public.borrower_complaints for all to authenticated using(private.is_borrower(borrower_id)) with check(private.is_borrower(borrower_id));

create or replace function public.start_loan_application(p_product_id uuid,p_first_name text,p_last_name text,p_date_of_birth date,p_nrc_number text,p_phone_e164 text,p_address text,p_consent boolean,p_amount_minor bigint,p_term_months int,p_purpose text,p_category text) returns uuid language plpgsql security definer set search_path='' as $$
declare target_product public.loan_products; borrower_key uuid; application_key uuid; actor uuid:=auth.uid();
begin
  if actor is null or not p_consent then raise exception 'authentication and consent are required'; end if;
  select * into target_product from public.loan_products where id=p_product_id and active and published;
  if target_product.id is null or not private.tenant_can_operate(target_product.tenant_id) then raise exception 'product is unavailable'; end if;
  if p_amount_minor not between target_product.min_amount_minor and target_product.max_amount_minor or p_term_months not between target_product.min_term_months and target_product.max_term_months or not(p_category=any(target_product.applicant_categories)) then raise exception 'application terms are outside product rules'; end if;
  insert into public.borrowers(tenant_id,profile_id,first_name,last_name,date_of_birth,nrc_number,phone_e164,residential_address,consented_at)
  values(target_product.tenant_id,actor,trim(p_first_name),trim(p_last_name),p_date_of_birth,nullif(trim(p_nrc_number),''),p_phone_e164,trim(p_address),now())
  on conflict(tenant_id,profile_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,date_of_birth=excluded.date_of_birth,nrc_number=excluded.nrc_number,phone_e164=excluded.phone_e164,residential_address=excluded.residential_address,consented_at=excluded.consented_at,updated_at=now()
  returning id into borrower_key;
  insert into public.loan_applications(tenant_id,borrower_id,product_id,requested_amount_minor,requested_term_months,purpose,applicant_category)
  values(target_product.tenant_id,borrower_key,target_product.id,p_amount_minor,p_term_months,trim(p_purpose),p_category) returning id into application_key;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(target_product.tenant_id,actor,'loan_application',application_key,'application.draft_created',jsonb_build_object('productId',target_product.id));
  return application_key;
end $$;
revoke all on function public.start_loan_application(uuid,text,text,date,text,text,text,boolean,bigint,int,text,text) from public,anon;
grant execute on function public.start_loan_application(uuid,text,text,date,text,text,text,boolean,bigint,int,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('borrower-evidence','borrower-evidence',false,10485760,array['application/pdf','image/png','image/jpeg']) on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('borrower-documents','borrower-documents',false,10485760,array['application/pdf']) on conflict(id) do nothing;
create policy borrower_evidence_read on storage.objects for select to authenticated using(bucket_id='borrower-evidence' and exists(select 1 from public.application_documents d join public.borrowers b on b.id=d.borrower_id where d.storage_path=name and (b.profile_id=auth.uid() or private.is_tenant_member(d.tenant_id) or private.is_platform_user())));

create index borrowers_profile_idx on public.borrowers(profile_id,tenant_id);
create index applications_tenant_status_idx on public.loan_applications(tenant_id,status,created_at desc);
create index application_documents_period_idx on public.application_documents(application_id,document_type,period_month);
create index loans_tenant_status_idx on public.loans(tenant_id,status,created_at desc);
create index instalments_due_idx on public.loan_instalments(tenant_id,due_date) where paid_minor < principal_minor+interest_minor+fees_minor;

create or replace function public.submit_loan_application(p_application_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare target public.loan_applications; product public.loan_products; required_income boolean; payslip_count int; statement_count int;
begin
  select a.* into target from public.loan_applications a join public.borrowers b on b.id=a.borrower_id where a.id=p_application_id and b.profile_id=auth.uid() for update;
  if target.id is null or target.status not in('draft','needs_information') then raise exception 'application is not editable'; end if;
  select * into product from public.loan_products where id=target.product_id;
  required_income:=target.applicant_category in('employed','self_employed','business_owner','pensioner');
  if target.applicant_category='employed' and not exists(select 1 from public.borrower_employment e where e.application_id=target.id and e.net_monthly_minor is not null) then raise exception 'employment details are required'; end if;
  if required_income and not exists(select 1 from public.borrower_income_sources i where i.application_id=target.id) then raise exception 'income details are required'; end if;
  select count(distinct period_month) into payslip_count from public.application_documents where application_id=target.id and document_type='payslip' and review_status<>'rejected';
  select count(distinct period_month) into statement_count from public.application_documents where application_id=target.id and document_type in('bank_statement','mobile_money_statement') and review_status<>'rejected';
  if payslip_count<product.required_payslip_months or statement_count<product.required_statement_months then raise exception 'required monthly evidence is incomplete'; end if;
  update public.loan_applications set status='submitted',submitted_at=now(),updated_at=now() where id=target.id;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(target.tenant_id,auth.uid(),'loan_application',target.id,'application.submitted',jsonb_build_object('payslipPeriods',payslip_count,'statementPeriods',statement_count));
end $$;
revoke all on function public.submit_loan_application(uuid) from public,anon;
grant execute on function public.submit_loan_application(uuid) to authenticated;

create or replace function public.review_application_document(p_document_id uuid,p_decision public.document_review_status,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare target public.application_documents; app public.loan_applications;
begin
  if p_decision not in('accepted','rejected','waived') or length(trim(p_reason))<5 then raise exception 'a documented review reason is required'; end if;
  select * into target from public.application_documents where id=p_document_id for update;
  if target.id is null or not private.has_tenant_permission(target.tenant_id,'applications.review') then raise exception 'not authorised'; end if;
  select * into app from public.loan_applications where id=target.application_id;
  if app.status not in('submitted','under_review','needs_information') then raise exception 'application is not reviewable'; end if;
  update public.application_documents set review_status=p_decision,review_reason=trim(p_reason),reviewed_by=auth.uid(),reviewed_at=now() where id=target.id;
  insert into public.financial_document_reviews(tenant_id,document_id,decision,reason,reviewed_by) values(target.tenant_id,target.id,p_decision,trim(p_reason),auth.uid());
  update public.loan_applications set status='under_review',updated_at=now() where id=app.id and status='submitted';
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,reason,metadata) values(target.tenant_id,auth.uid(),'application_document',target.id,'application.document_'||p_decision::text,trim(p_reason),jsonb_build_object('applicationId',target.application_id));
end $$;
revoke all on function public.review_application_document(uuid,public.document_review_status,text) from public,anon;
grant execute on function public.review_application_document(uuid,public.document_review_status,text) to authenticated;

create or replace function public.accept_income_source(p_income_id uuid,p_accepted_minor bigint) returns void language plpgsql security definer set search_path='' as $$
declare target public.borrower_income_sources;
begin
  select * into target from public.borrower_income_sources where id=p_income_id for update;
  if target.id is null or not private.has_tenant_permission(target.tenant_id,'applications.review') or p_accepted_minor<0 then raise exception 'not authorised or invalid amount'; end if;
  update public.borrower_income_sources set lender_accepted_amount_minor=p_accepted_minor,reviewed_by=auth.uid(),reviewed_at=now() where id=target.id;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(target.tenant_id,auth.uid(),'income_source',target.id,'application.income_accepted',jsonb_build_object('declaredMinor',target.monthly_amount_minor,'acceptedMinor',p_accepted_minor));
end $$;
revoke all on function public.accept_income_source(uuid,bigint) from public,anon;
grant execute on function public.accept_income_source(uuid,bigint) to authenticated;

create or replace function public.create_affordability_assessment(p_application_id uuid,p_obligations_minor bigint,p_instalment_minor bigint,p_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare app public.loan_applications; accepted_income bigint; disposable bigint; ratio int; assessment_id uuid;
begin
  select * into app from public.loan_applications where id=p_application_id;
  if app.id is null or not private.has_tenant_permission(app.tenant_id,'applications.review') or app.status not in('submitted','under_review','needs_information') then raise exception 'not authorised'; end if;
  if p_obligations_minor<0 or p_instalment_minor<0 or length(trim(p_notes))<5 then raise exception 'invalid assessment inputs'; end if;
  select coalesce(sum(lender_accepted_amount_minor),0) into accepted_income from public.borrower_income_sources where application_id=app.id and lender_accepted_amount_minor is not null;
  if accepted_income<=0 then raise exception 'no lender-accepted income'; end if;
  disposable:=accepted_income-p_obligations_minor-p_instalment_minor;
  ratio:=round(((p_obligations_minor+p_instalment_minor)::numeric*10000)/accepted_income);
  insert into public.affordability_assessments(tenant_id,application_id,accepted_net_income_minor,declared_obligations_minor,proposed_instalment_minor,disposable_income_minor,debt_service_ratio_bps,assessed_by,notes) values(app.tenant_id,app.id,accepted_income,p_obligations_minor,p_instalment_minor,disposable,ratio,auth.uid(),trim(p_notes)) returning id into assessment_id;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(app.tenant_id,auth.uid(),'affordability_assessment',assessment_id,'application.affordability_assessed',jsonb_build_object('applicationId',app.id,'acceptedIncomeMinor',accepted_income,'dsrBps',ratio));
  return assessment_id;
end $$;
revoke all on function public.create_affordability_assessment(uuid,bigint,bigint,text) from public,anon;
grant execute on function public.create_affordability_assessment(uuid,bigint,bigint,text) to authenticated;

create or replace function public.decide_loan_application(p_application_id uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare app public.loan_applications; product public.loan_products; payslips int; statements int; next_status public.application_status;
begin
  select * into app from public.loan_applications where id=p_application_id for update;
  if app.id is null or not private.has_tenant_permission(app.tenant_id,'applications.decide') or app.status not in('submitted','under_review','needs_information') then raise exception 'not authorised'; end if;
  if p_decision not in('approve','reject','request_information') or length(trim(p_reason))<5 then raise exception 'valid decision and reason required'; end if;
  if p_decision='approve' then
    select * into product from public.loan_products where id=app.product_id;
    select count(distinct period_month) into payslips from public.application_documents where application_id=app.id and document_type='payslip' and review_status in('accepted','waived');
    select count(distinct period_month) into statements from public.application_documents where application_id=app.id and document_type in('bank_statement','mobile_money_statement') and review_status in('accepted','waived');
    if payslips<product.required_payslip_months or statements<product.required_statement_months or not exists(select 1 from public.affordability_assessments where application_id=app.id) then raise exception 'review and affordability requirements are incomplete'; end if;
  end if;
  next_status:=case p_decision when 'approve' then 'approved'::public.application_status when 'reject' then 'rejected'::public.application_status else 'needs_information'::public.application_status end;
  insert into public.application_decisions(tenant_id,application_id,decision,reason,decided_by) values(app.tenant_id,app.id,p_decision,trim(p_reason),auth.uid());
  update public.loan_applications set status=next_status,decided_at=case when p_decision in('approve','reject') then now() else decided_at end,updated_at=now() where id=app.id;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,reason,metadata) values(app.tenant_id,auth.uid(),'loan_application',app.id,'application.'||p_decision,trim(p_reason),'{}');
end $$;
revoke all on function public.decide_loan_application(uuid,text,text) from public,anon;
grant execute on function public.decide_loan_application(uuid,text,text) to authenticated;

create or replace function public.create_loan_agreement(p_application_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare app public.loan_applications; product public.loan_products; interest_total bigint; agreement_key uuid; loan_key uuid; snapshot jsonb; snapshot_hash text;
begin
  select * into app from public.loan_applications where id=p_application_id for update;
  if app.id is null or app.status<>'approved' or not private.has_tenant_permission(app.tenant_id,'loans.manage') or not private.tenant_can_operate(app.tenant_id) then raise exception 'application is not eligible'; end if;
  if exists(select 1 from public.loan_agreements where application_id=app.id) then raise exception 'agreement already exists'; end if;
  select * into product from public.loan_products where id=app.product_id;
  interest_total:=round((app.requested_amount_minor::numeric*product.annual_interest_rate_bps*app.requested_term_months)/120000);
  snapshot:=jsonb_build_object('applicationId',app.id,'productName',product.name,'principalMinor',app.requested_amount_minor,'annualInterestRateBps',product.annual_interest_rate_bps,'simpleInterestMinor',interest_total,'feesMinor',product.application_fee_minor,'termMonths',app.requested_term_months,'totalPayableMinor',app.requested_amount_minor+interest_total+product.application_fee_minor,'generatedAt',now());
  snapshot_hash:=encode(extensions.digest(snapshot::text,'sha256'),'hex');
  insert into public.loan_agreements(tenant_id,application_id,principal_minor,total_interest_minor,total_fees_minor,term_months,content_hash,terms_snapshot) values(app.tenant_id,app.id,app.requested_amount_minor,interest_total,product.application_fee_minor,app.requested_term_months,snapshot_hash,snapshot) returning id into agreement_key;
  insert into public.loans(tenant_id,application_id,borrower_id,agreement_id,account_number,principal_minor,annual_interest_rate_bps,term_months) values(app.tenant_id,app.id,app.borrower_id,agreement_key,'ZL-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),app.requested_amount_minor,product.annual_interest_rate_bps,app.requested_term_months) returning id into loan_key;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(app.tenant_id,auth.uid(),'loan_agreement',agreement_key,'agreement.generated',jsonb_build_object('applicationId',app.id,'contentHash',snapshot_hash));
  return loan_key;
end $$;
revoke all on function public.create_loan_agreement(uuid) from public,anon;
grant execute on function public.create_loan_agreement(uuid) to authenticated;

create or replace function public.accept_loan_agreement(p_agreement_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare agreement public.loan_agreements; app public.loan_applications;
begin
  select * into agreement from public.loan_agreements where id=p_agreement_id for update;
  select a.* into app from public.loan_applications a join public.borrowers b on b.id=a.borrower_id where a.id=agreement.application_id and b.profile_id=auth.uid();
  if agreement.id is null or app.id is null or agreement.accepted_at is not null then raise exception 'agreement is not available'; end if;
  update public.loan_agreements set accepted_at=now() where id=agreement.id;
  update public.loans set status='approved' where agreement_id=agreement.id and status='pending_agreement';
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(agreement.tenant_id,auth.uid(),'loan_agreement',agreement.id,'agreement.accepted',jsonb_build_object('contentHash',agreement.content_hash));
end $$;
revoke all on function public.accept_loan_agreement(uuid) from public,anon;
grant execute on function public.accept_loan_agreement(uuid) to authenticated;

create or replace function public.record_loan_disbursement(p_loan_id uuid,p_amount_minor bigint,p_method text,p_external_reference text,p_disbursed_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare target public.loans; agreement public.loan_agreements; base_principal bigint; base_interest bigint; principal_piece bigint; interest_piece bigint;
begin
  select * into target from public.loans where id=p_loan_id for update;
  if target.id is null or target.status<>'approved' or not private.has_tenant_permission(target.tenant_id,'loans.manage') or not private.tenant_can_operate(target.tenant_id) then raise exception 'loan is not eligible'; end if;
  select * into agreement from public.loan_agreements where id=target.agreement_id and accepted_at is not null;
  if agreement.id is null or p_amount_minor<>target.principal_minor or length(trim(p_external_reference))<3 or p_disbursed_at>now() then raise exception 'invalid disbursement record'; end if;
  insert into public.loan_disbursements(tenant_id,loan_id,amount_minor,method,external_reference,recorded_by,disbursed_at) values(target.tenant_id,target.id,p_amount_minor,trim(p_method),trim(p_external_reference),auth.uid(),p_disbursed_at);
  base_principal:=target.principal_minor/target.term_months; base_interest:=agreement.total_interest_minor/target.term_months;
  for instalment_no in 1..target.term_months loop
    principal_piece:=case when instalment_no=target.term_months then target.principal_minor-base_principal*(target.term_months-1) else base_principal end;
    interest_piece:=case when instalment_no=target.term_months then agreement.total_interest_minor-base_interest*(target.term_months-1) else base_interest end;
    insert into public.loan_instalments(tenant_id,loan_id,instalment_number,due_date,principal_minor,interest_minor,fees_minor) values(target.tenant_id,target.id,instalment_no,(p_disbursed_at::date+(instalment_no||' months')::interval)::date,principal_piece,interest_piece,case when instalment_no=1 then agreement.total_fees_minor else 0 end);
  end loop;
  update public.loans set status='active',disbursed_at=p_disbursed_at where id=target.id;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(target.tenant_id,auth.uid(),'loan',target.id,'loan.disbursement_recorded',jsonb_build_object('amountMinor',p_amount_minor,'method',p_method,'externalReference',p_external_reference));
end $$;
revoke all on function public.record_loan_disbursement(uuid,bigint,text,text,timestamptz) from public,anon;
grant execute on function public.record_loan_disbursement(uuid,bigint,text,text,timestamptz) to authenticated;

create or replace function public.record_loan_repayment(p_loan_id uuid,p_amount_minor bigint,p_method text,p_external_reference text,p_received_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare target public.loans; repayment_key uuid; receipt_key uuid; remaining bigint:=p_amount_minor; item record; available bigint; allocated bigint;
begin
  select * into target from public.loans where id=p_loan_id for update;
  if target.id is null or target.status not in('active','past_due') or not private.has_tenant_permission(target.tenant_id,'repayments.manage') then raise exception 'loan is not repayable'; end if;
  if p_amount_minor<=0 or p_received_at>now() or length(trim(p_external_reference))<3 then raise exception 'invalid repayment'; end if;
  if p_amount_minor>(select coalesce(sum(principal_minor+interest_minor+fees_minor-paid_minor),0) from public.loan_instalments where loan_id=target.id) then raise exception 'amount exceeds outstanding balance'; end if;
  insert into public.loan_repayments(tenant_id,loan_id,amount_minor,method,external_reference,received_at,recorded_by) values(target.tenant_id,target.id,p_amount_minor,trim(p_method),trim(p_external_reference),p_received_at,auth.uid()) returning id into repayment_key;
  for item in select * from public.loan_instalments where loan_id=target.id and paid_minor<principal_minor+interest_minor+fees_minor order by due_date,instalment_number for update loop
    exit when remaining=0; available:=item.principal_minor+item.interest_minor+item.fees_minor-item.paid_minor; allocated:=least(remaining,available);
    update public.loan_instalments set paid_minor=paid_minor+allocated where id=item.id;
    insert into public.repayment_allocations(tenant_id,repayment_id,instalment_id,amount_minor) values(target.tenant_id,repayment_key,item.id,allocated);
    remaining:=remaining-allocated;
  end loop;
  insert into public.loan_repayment_receipts(tenant_id,repayment_id,receipt_number,amount_minor) values(target.tenant_id,repayment_key,'RCP-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(repayment_key::text,'-',''),1,8)),p_amount_minor) returning id into receipt_key;
  if not exists(select 1 from public.loan_instalments where loan_id=target.id and paid_minor<principal_minor+interest_minor+fees_minor) then update public.loans set status='settled' where id=target.id; end if;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(target.tenant_id,auth.uid(),'loan_repayment',repayment_key,'loan.repayment_recorded',jsonb_build_object('amountMinor',p_amount_minor,'externalReference',p_external_reference,'receiptId',receipt_key));
  insert into public.email_outbox(tenant_id,message_type,recipient,subject,template_version,payload,idempotency_key) select target.tenant_id,'borrower_repayment_receipt',p.email,'Repayment receipt '||rr.receipt_number,1,jsonb_build_object('loanId',target.id,'repaymentId',repayment_key,'receiptId',receipt_key,'reference',rr.receipt_number),'borrower-receipt:'||repayment_key from public.borrowers b join public.profiles p on p.id=b.profile_id join public.loan_repayment_receipts rr on rr.id=receipt_key where b.id=target.borrower_id;
  return repayment_key;
end $$;
revoke all on function public.record_loan_repayment(uuid,bigint,text,text,timestamptz) from public,anon;
grant execute on function public.record_loan_repayment(uuid,bigint,text,text,timestamptz) to authenticated;

create or replace function public.reverse_loan_repayment(p_repayment_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare target public.loan_repayments; allocation record;
begin
  select * into target from public.loan_repayments where id=p_repayment_id for update;
  if target.id is null or target.reversed_at is not null or not private.has_tenant_permission(target.tenant_id,'repayments.manage') or length(trim(p_reason))<8 then raise exception 'repayment cannot be reversed'; end if;
  for allocation in select * from public.repayment_allocations where repayment_id=target.id order by created_at desc loop update public.loan_instalments set paid_minor=paid_minor-allocation.amount_minor where id=allocation.instalment_id and paid_minor>=allocation.amount_minor; end loop;
  insert into public.repayment_adjustments(tenant_id,repayment_id,adjustment_type,amount_minor,reason,created_by) values(target.tenant_id,target.id,'reversal',target.amount_minor,trim(p_reason),auth.uid());
  update public.loan_repayments set reversed_at=now(),reversal_reason=trim(p_reason) where id=target.id;
  update public.loans set status='active' where id=target.loan_id and status='settled';
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,reason,metadata) values(target.tenant_id,auth.uid(),'loan_repayment',target.id,'loan.repayment_reversed',trim(p_reason),jsonb_build_object('amountMinor',target.amount_minor));
end $$;
revoke all on function public.reverse_loan_repayment(uuid,text) from public,anon;
grant execute on function public.reverse_loan_repayment(uuid,text) to authenticated;

create or replace function public.submit_borrower_complaint(p_borrower_id uuid,p_subject text,p_description text) returns uuid language plpgsql security definer set search_path='' as $$
declare borrower public.borrowers; complaint_id uuid; recipient text;
begin
  select * into borrower from public.borrowers where id=p_borrower_id and profile_id=auth.uid();
  if borrower.id is null or length(trim(p_subject))<5 or length(trim(p_description))<10 then raise exception 'invalid complaint'; end if;
  insert into public.borrower_complaints(tenant_id,borrower_id,subject,description) values(borrower.tenant_id,borrower.id,trim(p_subject),trim(p_description)) returning id into complaint_id;
  select coalesce(complaints_email,support_email) into recipient from public.lender_public_profiles where tenant_id=borrower.tenant_id;
  if recipient is not null then insert into public.email_outbox(tenant_id,message_type,recipient,subject,template_version,payload,idempotency_key) values(borrower.tenant_id,'borrower_complaint_opened',recipient,'New borrower complaint',1,jsonb_build_object('complaintId',complaint_id,'reference',complaint_id), 'complaint-opened:'||complaint_id); end if;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(borrower.tenant_id,auth.uid(),'borrower_complaint',complaint_id,'complaint.opened','{}');
  return complaint_id;
end $$;
revoke all on function public.submit_borrower_complaint(uuid,text,text) from public,anon;
grant execute on function public.submit_borrower_complaint(uuid,text,text) to authenticated;

create or replace function public.resolve_borrower_complaint(p_complaint_id uuid,p_status text,p_resolution text) returns void language plpgsql security definer set search_path='' as $$
declare target public.borrower_complaints;
begin
  select * into target from public.borrower_complaints where id=p_complaint_id for update;
  if target.id is null or not private.has_tenant_permission(target.tenant_id,'complaints.manage') or p_status not in('acknowledged','investigating','resolved','closed') or length(trim(p_resolution))<5 then raise exception 'invalid complaint update'; end if;
  update public.borrower_complaints set status=p_status,resolution=trim(p_resolution),resolved_at=case when p_status in('resolved','closed') then now() else null end where id=target.id;
  insert into public.email_outbox(tenant_id,message_type,recipient,subject,template_version,payload,idempotency_key) select target.tenant_id,'borrower_complaint_updated',p.email,'Complaint status updated',1,jsonb_build_object('complaintId',target.id,'status',p_status,'reference',target.id), 'complaint-update:'||target.id||':'||p_status from public.borrowers b join public.profiles p on p.id=b.profile_id where b.id=target.borrower_id on conflict(idempotency_key) do nothing;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,reason,metadata) values(target.tenant_id,auth.uid(),'borrower_complaint',target.id,'complaint.'||p_status,trim(p_resolution),'{}');
end $$;
revoke all on function public.resolve_borrower_complaint(uuid,text,text) from public,anon;
grant execute on function public.resolve_borrower_complaint(uuid,text,text) to authenticated;

commit;
