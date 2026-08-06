begin;

create temporary table rls_test_identity(profile_id uuid) on commit drop;
create temporary table rls_test_tenants(allowed_id uuid, blocked_id uuid) on commit drop;

insert into rls_test_identity
select id from public.profiles order by created_at limit 1;

do $$
begin
  if not exists(select 1 from rls_test_identity) then
    raise exception 'RLS test requires one existing verified profile';
  end if;
end $$;

update public.platform_users
set active = false
where profile_id = (select profile_id from rls_test_identity);

with allowed as (
  insert into public.tenants(legal_name, pacra_number, tpin, created_by)
  select 'RLS allowed fixture', 'RLS-A-' || gen_random_uuid(), '0000000001', profile_id
  from rls_test_identity
  returning id
), blocked as (
  insert into public.tenants(legal_name, pacra_number, tpin, created_by)
  select 'RLS blocked fixture', 'RLS-B-' || gen_random_uuid(), '0000000002', profile_id
  from rls_test_identity
  returning id
)
insert into rls_test_tenants
select allowed.id, blocked.id from allowed cross join blocked;

with role_insert as (
  insert into public.tenant_roles(tenant_id, code, name)
  select allowed_id, 'rls_tester', 'RLS tester' from rls_test_tenants
  returning id, tenant_id
)
insert into public.tenant_memberships(tenant_id, profile_id, role_id)
select role_insert.tenant_id, rls_test_identity.profile_id, role_insert.id
from role_insert cross join rls_test_identity;

grant select on rls_test_identity, rls_test_tenants to authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', profile_id, 'role', 'authenticated')::text,
  true
)
from rls_test_identity;
set local role authenticated;

do $$
declare allowed_tenant uuid; blocked_tenant uuid;
begin
  select allowed_id, blocked_id into allowed_tenant, blocked_tenant from rls_test_tenants;
  if not exists(select 1 from public.tenants where id = allowed_tenant) then
    raise exception 'RLS denied the authenticated tenant member';
  end if;
  if exists(select 1 from public.tenants where id = blocked_tenant) then
    raise exception 'RLS exposed a tenant without membership';
  end if;
  if (select count(*) from public.tenant_memberships where tenant_id in (allowed_tenant, blocked_tenant)) <> 1 then
    raise exception 'Membership RLS crossed tenant boundaries';
  end if;
end $$;

rollback;
