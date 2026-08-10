begin;

create table public.collateral_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid not null references public.loan_applications(id) on delete restrict,
  borrower_id uuid not null references public.borrowers(id) on delete restrict,
  loan_id uuid references public.loans(id) on delete restrict,
  category text not null check(category in('motor_vehicle','land','equipment','inventory','household_asset','guarantee','other')),
  description text not null,
  ownership_reference text,
  location text,
  custody_holder text not null default 'borrower' check(custody_holder in('borrower','lender','third_party')),
  status text not null default 'registered' check(status in('registered','verified','released','enforcement_review','repossession_recorded','sale_recorded')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,tenant_id),
  constraint collateral_application_identity_fk foreign key(application_id,borrower_id,tenant_id) references public.loan_applications(id,borrower_id,tenant_id),
  constraint collateral_loan_tenant_fk foreign key(loan_id,tenant_id) references public.loans(id,tenant_id)
);

create table public.collateral_valuations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collateral_id uuid not null references public.collateral_assets(id) on delete restrict,
  value_minor bigint not null check(value_minor>0),
  valued_on date not null,
  valuer_name text not null,
  method text not null,
  notes text,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint valuations_collateral_tenant_fk foreign key(collateral_id,tenant_id) references public.collateral_assets(id,tenant_id)
);

create table public.collateral_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collateral_id uuid not null references public.collateral_assets(id) on delete restrict,
  from_status text,
  to_status text not null,
  reason text not null,
  external_reference text,
  occurred_at timestamptz not null,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint collateral_events_asset_tenant_fk foreign key(collateral_id,tenant_id) references public.collateral_assets(id,tenant_id)
);

alter table public.collateral_assets enable row level security;
alter table public.collateral_valuations enable row level security;
alter table public.collateral_events enable row level security;
create policy collateral_member_read on public.collateral_assets for select to authenticated using(private.is_tenant_member(tenant_id));
create policy collateral_valuations_member_read on public.collateral_valuations for select to authenticated using(private.is_tenant_member(tenant_id));
create policy collateral_events_member_read on public.collateral_events for select to authenticated using(private.is_tenant_member(tenant_id));

insert into public.tenant_role_permissions(role_id,permission)
select r.id,p.permission from public.tenant_roles r cross join lateral unnest(
  case r.code when 'owner' then array['collateral.read','collateral.manage'] when 'manager' then array['collateral.read','collateral.manage'] when 'credit_officer' then array['collateral.read','collateral.manage'] else array[]::text[] end
) p(permission) where r.code in('owner','manager','credit_officer') on conflict do nothing;

create or replace function private.create_default_tenant_staff_roles() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.code='owner' then
    insert into public.tenant_roles(tenant_id,code,name) values (new.tenant_id,'manager','Branch Manager'),(new.tenant_id,'credit_officer','Credit Officer'),(new.tenant_id,'collections_officer','Collections Officer') on conflict(tenant_id,code) do nothing;
  elsif new.code='manager' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['applications.read','applications.review','applications.decide','products.manage','loans.manage','repayments.manage','complaints.manage','collateral.read','collateral.manage']) on conflict do nothing;
  elsif new.code='credit_officer' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['applications.read','applications.review','applications.decide','collateral.read','collateral.manage']) on conflict do nothing;
  elsif new.code='collections_officer' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['loans.manage','repayments.manage','complaints.manage','collateral.read']) on conflict do nothing;
  end if; return new;
end $$;

create or replace function public.register_collateral(p_application_id uuid,p_category text,p_description text,p_ownership_reference text,p_location text,p_custody_holder text)
returns uuid language plpgsql security definer set search_path='' as $$
declare app public.loan_applications; collateral_key uuid; linked_loan uuid;
begin
  select * into app from public.loan_applications where id=p_application_id;
  if app.id is null or not private.has_tenant_permission(app.tenant_id,'collateral.manage') or not private.tenant_can_operate(app.tenant_id) then raise exception 'not authorised'; end if;
  if p_category not in('motor_vehicle','land','equipment','inventory','household_asset','guarantee','other') or length(trim(p_description))<5 or p_custody_holder not in('borrower','lender','third_party') then raise exception 'invalid collateral details'; end if;
  select id into linked_loan from public.loans where application_id=app.id;
  insert into public.collateral_assets(tenant_id,application_id,borrower_id,loan_id,category,description,ownership_reference,location,custody_holder,created_by)
  values(app.tenant_id,app.id,app.borrower_id,linked_loan,p_category,trim(p_description),nullif(trim(p_ownership_reference),''),nullif(trim(p_location),''),p_custody_holder,auth.uid()) returning id into collateral_key;
  insert into public.collateral_events(tenant_id,collateral_id,to_status,reason,occurred_at,recorded_by) values(app.tenant_id,collateral_key,'registered','Collateral manually registered by lender',now(),auth.uid());
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(app.tenant_id,auth.uid(),'collateral',collateral_key,'collateral.registered',jsonb_build_object('applicationId',app.id,'category',p_category));
  return collateral_key;
end $$;
revoke all on function public.register_collateral(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.register_collateral(uuid,text,text,text,text,text) to authenticated;

create or replace function public.record_collateral_valuation(p_collateral_id uuid,p_value_minor bigint,p_valued_on date,p_valuer_name text,p_method text,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.collateral_assets; valuation_key uuid;
begin
  select * into target from public.collateral_assets where id=p_collateral_id;
  if target.id is null or not private.has_tenant_permission(target.tenant_id,'collateral.manage') then raise exception 'not authorised'; end if;
  if p_value_minor<=0 or p_valued_on>current_date or length(trim(p_valuer_name))<2 or length(trim(p_method))<3 then raise exception 'invalid valuation'; end if;
  insert into public.collateral_valuations(tenant_id,collateral_id,value_minor,valued_on,valuer_name,method,notes,recorded_by) values(target.tenant_id,target.id,p_value_minor,p_valued_on,trim(p_valuer_name),trim(p_method),nullif(trim(p_notes),''),auth.uid()) returning id into valuation_key;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(target.tenant_id,auth.uid(),'collateral_valuation',valuation_key,'collateral.valuation_recorded',jsonb_build_object('collateralId',target.id,'valueMinor',p_value_minor));
  return valuation_key;
end $$;
revoke all on function public.record_collateral_valuation(uuid,bigint,date,text,text,text) from public,anon;
grant execute on function public.record_collateral_valuation(uuid,bigint,date,text,text,text) to authenticated;

create or replace function public.record_collateral_status(p_collateral_id uuid,p_status text,p_reason text,p_reference text,p_occurred_at timestamptz,p_manual_confirmation boolean)
returns void language plpgsql security definer set search_path='' as $$
declare target public.collateral_assets;
begin
  select * into target from public.collateral_assets where id=p_collateral_id for update;
  if target.id is null or not private.has_tenant_permission(target.tenant_id,'collateral.manage') then raise exception 'not authorised'; end if;
  if p_status not in('verified','released','enforcement_review','repossession_recorded','sale_recorded') or length(trim(p_reason))<10 or p_occurred_at>now() then raise exception 'invalid collateral event'; end if;
  if p_status in('repossession_recorded','sale_recorded') and (not p_manual_confirmation or length(trim(p_reference))<3) then raise exception 'manual lender confirmation and external reference required'; end if;
  if target.status='released' or target.status='sale_recorded' then raise exception 'terminal collateral status cannot be changed'; end if;
  update public.collateral_assets set status=p_status,updated_at=now(),custody_holder=case when p_status='released' then 'borrower' when p_status='repossession_recorded' then 'lender' else custody_holder end where id=target.id;
  insert into public.collateral_events(tenant_id,collateral_id,from_status,to_status,reason,external_reference,occurred_at,recorded_by) values(target.tenant_id,target.id,target.status,p_status,trim(p_reason),nullif(trim(p_reference),''),p_occurred_at,auth.uid());
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,reason,metadata) values(target.tenant_id,auth.uid(),'collateral',target.id,'collateral.'||p_status,trim(p_reason),jsonb_build_object('externalReference',nullif(trim(p_reference),''),'manualConfirmation',p_manual_confirmation));
end $$;
revoke all on function public.record_collateral_status(uuid,text,text,text,timestamptz,boolean) from public,anon;
grant execute on function public.record_collateral_status(uuid,text,text,text,timestamptz,boolean) to authenticated;

create index collateral_tenant_status_idx on public.collateral_assets(tenant_id,status,created_at desc);
create index collateral_application_idx on public.collateral_assets(application_id);
create index collateral_events_asset_idx on public.collateral_events(collateral_id,occurred_at desc);

commit;
