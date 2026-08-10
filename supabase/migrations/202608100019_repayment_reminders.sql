begin;

create table public.repayment_reminder_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  enabled boolean not null default true,
  days_before_due int not null default 3 check (days_before_due between 0 and 30),
  send_on_due_date boolean not null default true,
  overdue_every_days int not null default 7 check (overdue_every_days between 1 and 30),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.repayment_reminder_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  loan_id uuid not null,
  instalment_id uuid not null,
  reminder_kind text not null check (reminder_kind in ('upcoming','due_today','overdue')),
  effective_date date not null,
  outbox_id uuid not null unique references public.email_outbox(id),
  created_at timestamptz not null default now(),
  foreign key (loan_id,tenant_id) references public.loans(id,tenant_id),
  foreign key (instalment_id,tenant_id) references public.loan_instalments(id,tenant_id),
  unique (instalment_id,reminder_kind,effective_date)
);

alter table public.repayment_reminder_settings enable row level security;
alter table public.repayment_reminder_events enable row level security;
create policy reminder_settings_member_read on public.repayment_reminder_settings for select to authenticated using (private.is_tenant_member(tenant_id));
create policy reminder_events_member_read on public.repayment_reminder_events for select to authenticated using (private.is_tenant_member(tenant_id));

insert into public.tenant_role_permissions(role_id,permission)
select r.id,'reminders.manage' from public.tenant_roles r where r.code in ('owner','manager','collections_officer') on conflict do nothing;

create or replace function public.queue_due_repayment_reminders(p_as_of_date date default current_date)
returns int language plpgsql security definer set search_path='' as $$
declare candidate record; outbox_key uuid; queued int:=0;
begin
  for candidate in
    select i.id instalment_id,i.tenant_id,i.loan_id,i.due_date,
      i.principal_minor+i.interest_minor+i.fees_minor-i.paid_minor outstanding_minor,
      l.account_number,p.email,coalesce(t.trading_name,t.legal_name) lender_name,
      case
        when i.due_date=p_as_of_date then 'due_today'
        when i.due_date>p_as_of_date then 'upcoming'
        else 'overdue'
      end reminder_kind
    from public.loan_instalments i
    join public.loans l on l.id=i.loan_id and l.tenant_id=i.tenant_id
    join public.borrowers b on b.id=l.borrower_id and b.tenant_id=l.tenant_id
    join public.profiles p on p.id=b.profile_id
    join public.tenants t on t.id=i.tenant_id
    left join public.repayment_reminder_settings s on s.tenant_id=i.tenant_id
    where coalesce(s.enabled,true)
      and private.tenant_can_operate(i.tenant_id)
      and l.status in ('disbursed','active','past_due')
      and i.paid_minor < i.principal_minor+i.interest_minor+i.fees_minor
      and (
        i.due_date=p_as_of_date and coalesce(s.send_on_due_date,true)
        or coalesce(s.days_before_due,3)>0 and i.due_date=p_as_of_date+coalesce(s.days_before_due,3)
        or i.due_date<p_as_of_date and mod(p_as_of_date-i.due_date,coalesce(s.overdue_every_days,7))=0
      )
  loop
    insert into public.email_outbox(tenant_id,message_type,recipient,subject,template_version,payload,idempotency_key)
    values(candidate.tenant_id,'borrower_repayment_reminder',candidate.email,
      case candidate.reminder_kind when 'upcoming' then 'Upcoming repayment reminder' when 'due_today' then 'Repayment due today' else 'Overdue repayment reminder' end,
      1,jsonb_build_object('reference',candidate.account_number,'loanId',candidate.loan_id,'instalmentId',candidate.instalment_id,'kind',candidate.reminder_kind,'dueDate',candidate.due_date,'outstandingMinor',candidate.outstanding_minor,'lenderName',candidate.lender_name),
      'repayment-reminder:'||candidate.instalment_id||':'||candidate.reminder_kind||':'||p_as_of_date)
    on conflict(idempotency_key) do nothing returning id into outbox_key;
    if outbox_key is not null then
      insert into public.repayment_reminder_events(tenant_id,loan_id,instalment_id,reminder_kind,effective_date,outbox_id)
      values(candidate.tenant_id,candidate.loan_id,candidate.instalment_id,candidate.reminder_kind,p_as_of_date,outbox_key);
      insert into public.audit_events(tenant_id,entity_type,entity_id,action,metadata)
      values(candidate.tenant_id,'loan_instalment',candidate.instalment_id,'repayment.reminder_queued',jsonb_build_object('kind',candidate.reminder_kind,'effectiveDate',p_as_of_date));
      queued:=queued+1;
    end if;
    outbox_key:=null;
  end loop;
  return queued;
end $$;
revoke all on function public.queue_due_repayment_reminders(date) from public,anon,authenticated;
grant execute on function public.queue_due_repayment_reminders(date) to service_role;

create index repayment_reminder_events_tenant_date_idx on public.repayment_reminder_events(tenant_id,effective_date desc);

create or replace function private.create_default_tenant_staff_roles() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.code='owner' then
    insert into public.tenant_roles(tenant_id,code,name) values
      (new.tenant_id,'manager','Branch Manager'),
      (new.tenant_id,'credit_officer','Credit Officer'),
      (new.tenant_id,'collections_officer','Collections Officer')
    on conflict(tenant_id,code) do nothing;
  elsif new.code='manager' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['applications.read','applications.review','applications.decide','products.manage','loans.manage','repayments.manage','complaints.manage','collateral.read','collateral.manage','reminders.manage']) on conflict do nothing;
  elsif new.code='credit_officer' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['applications.read','applications.review','applications.decide','collateral.read','collateral.manage']) on conflict do nothing;
  elsif new.code='collections_officer' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['loans.manage','repayments.manage','complaints.manage','collateral.read','reminders.manage']) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.create_default_tenant_staff_roles() from public,anon,authenticated;
commit;
