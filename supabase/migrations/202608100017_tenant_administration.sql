begin;

alter table public.tenant_roles add constraint tenant_roles_id_tenant_unique unique (id, tenant_id);
alter table public.tenant_memberships add constraint tenant_memberships_id_tenant_unique unique (id, tenant_id);

create table public.tenant_branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  physical_address text not null,
  phone_e164 text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id)
);

create table public.tenant_member_branches (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null references public.tenant_memberships(id) on delete cascade,
  branch_id uuid not null references public.tenant_branches(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (membership_id, branch_id),
  foreign key (branch_id, tenant_id) references public.tenant_branches(id, tenant_id),
  foreign key (membership_id, tenant_id) references public.tenant_memberships(id, tenant_id)
);

create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role_id uuid not null references public.tenant_roles(id),
  branch_id uuid references public.tenant_branches(id),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  invited_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  foreign key (role_id, tenant_id) references public.tenant_roles(id, tenant_id),
  foreign key (branch_id, tenant_id) references public.tenant_branches(id, tenant_id)
);

alter table public.lender_public_profiles
  add column if not exists primary_colour text not null default '#123f35' check (primary_colour ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists accent_colour text not null default '#d1922d' check (accent_colour ~ '^#[0-9A-Fa-f]{6}$');

alter table public.tenant_branches enable row level security;
alter table public.tenant_member_branches enable row level security;
alter table public.tenant_invitations enable row level security;

create policy branches_member_read on public.tenant_branches for select to authenticated using (private.is_tenant_member(tenant_id));
create policy member_branches_member_read on public.tenant_member_branches for select to authenticated using (private.is_tenant_member(tenant_id));
create policy invitations_manager_read on public.tenant_invitations for select to authenticated using (private.has_tenant_permission(tenant_id, 'team.manage'));

insert into public.tenant_role_permissions (role_id, permission)
select r.id, p.permission
from public.tenant_roles r
cross join unnest(array['branches.manage','team.manage','branding.manage']) p(permission)
where r.code = 'owner'
on conflict do nothing;

insert into public.tenant_roles (tenant_id, code, name)
select t.id, role.code, role.name from public.tenants t cross join (values
  ('manager','Branch Manager'),('credit_officer','Credit Officer'),('collections_officer','Collections Officer')
) role(code,name) on conflict (tenant_id,code) do nothing;
insert into public.tenant_role_permissions(role_id,permission)
select r.id,p.permission from public.tenant_roles r cross join lateral unnest(
  case r.code
    when 'manager' then array['applications.read','applications.review','applications.decide','products.manage','loans.manage','repayments.manage','complaints.manage']
    when 'credit_officer' then array['applications.read','applications.review','applications.decide']
    when 'collections_officer' then array['loans.manage','repayments.manage','complaints.manage']
    else array[]::text[] end
) p(permission) where r.code in('manager','credit_officer','collections_officer') on conflict do nothing;

create or replace function private.create_default_tenant_staff_roles() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.code='owner' then
    insert into public.tenant_roles(tenant_id,code,name) values
      (new.tenant_id,'manager','Branch Manager'),
      (new.tenant_id,'credit_officer','Credit Officer'),
      (new.tenant_id,'collections_officer','Collections Officer')
    on conflict(tenant_id,code) do nothing;
  elsif new.code='manager' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['applications.read','applications.review','applications.decide','products.manage','loans.manage','repayments.manage','complaints.manage']) on conflict do nothing;
  elsif new.code='credit_officer' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['applications.read','applications.review','applications.decide']) on conflict do nothing;
  elsif new.code='collections_officer' then
    insert into public.tenant_role_permissions(role_id,permission) select new.id,unnest(array['loans.manage','repayments.manage','complaints.manage']) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.create_default_tenant_staff_roles() from public,anon,authenticated;
create trigger create_default_tenant_staff_roles after insert on public.tenant_roles for each row execute function private.create_default_tenant_staff_roles();

create or replace function private.tenant_entitlement_limit(target_tenant uuid, target_entitlement text)
returns bigint language sql stable security definer set search_path='' as $$
  select e.limit_value
  from public.tenant_subscriptions s
  join public.plan_entitlements e on e.plan_version_id=s.plan_version_id
  where s.tenant_id=target_tenant and s.status in ('active','grace') and e.entitlement=target_entitlement and e.enabled
  order by s.created_at desc limit 1
$$;
revoke all on function private.tenant_entitlement_limit(uuid,text) from public,anon,authenticated;

create or replace function public.create_tenant_branch(p_code text,p_name text,p_address text,p_phone text)
returns uuid language plpgsql security definer set search_path='' as $$
declare tenant_key uuid; branch_key uuid; branch_limit bigint;
begin
  select m.tenant_id into tenant_key from public.tenant_memberships m join public.tenants t on t.id=m.tenant_id where m.profile_id=auth.uid() and m.active and t.status='active' limit 1;
  if tenant_key is null or not private.has_tenant_permission(tenant_key,'branches.manage') then raise exception 'not authorised'; end if;
  branch_limit:=private.tenant_entitlement_limit(tenant_key,'branches');
  if branch_limit is null or (select count(*) from public.tenant_branches where tenant_id=tenant_key and active)>=branch_limit then raise exception 'branch plan limit reached'; end if;
  if trim(p_code)!~'^[a-z0-9_-]{2,20}$' or length(trim(p_name))<2 or length(trim(p_address))<8 then raise exception 'invalid branch details'; end if;
  insert into public.tenant_branches(tenant_id,code,name,physical_address,phone_e164,created_by) values(tenant_key,lower(trim(p_code)),trim(p_name),trim(p_address),nullif(trim(p_phone),''),auth.uid()) returning id into branch_key;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(tenant_key,auth.uid(),'tenant_branch',branch_key,'branch.created',jsonb_build_object('code',lower(trim(p_code))));
  return branch_key;
end $$;
revoke all on function public.create_tenant_branch(text,text,text,text) from public,anon;
grant execute on function public.create_tenant_branch(text,text,text,text) to authenticated;

create or replace function public.accept_tenant_invitation(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.tenant_invitations; profile_email text; membership_key uuid; user_limit bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into target from public.tenant_invitations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status='pending' for update;
  select lower(email) into profile_email from public.profiles where id=auth.uid();
  if target.id is null or target.expires_at<=now() or lower(target.email)<>profile_email then raise exception 'invitation is invalid or expired'; end if;
  user_limit:=private.tenant_entitlement_limit(target.tenant_id,'users');
  if user_limit is null or (select count(*) from public.tenant_memberships where tenant_id=target.tenant_id and active)>=user_limit then raise exception 'user plan limit reached'; end if;
  insert into public.tenant_memberships(tenant_id,profile_id,role_id) values(target.tenant_id,auth.uid(),target.role_id) returning id into membership_key;
  if target.branch_id is not null then insert into public.tenant_member_branches(tenant_id,membership_id,branch_id,assigned_by) values(target.tenant_id,membership_key,target.branch_id,target.invited_by); end if;
  update public.tenant_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=target.id;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(target.tenant_id,auth.uid(),'tenant_membership',membership_key,'team.invitation_accepted',jsonb_build_object('invitationId',target.id));
  return target.tenant_id;
end $$;
revoke all on function public.accept_tenant_invitation(text) from public,anon;
grant execute on function public.accept_tenant_invitation(text) to authenticated;

create index tenant_branches_tenant_active_idx on public.tenant_branches(tenant_id,active);
create index tenant_invitations_tenant_status_idx on public.tenant_invitations(tenant_id,status,created_at desc);
create unique index one_pending_tenant_invitation_per_email on public.tenant_invitations(tenant_id,lower(email)) where status='pending';

commit;
