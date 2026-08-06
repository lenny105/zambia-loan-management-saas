begin;
create or replace function private.handle_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,display_name) values(new.id,lower(new.email),nullif(new.raw_user_meta_data->>'display_name','')) on conflict(id) do nothing;
  insert into public.audit_events(actor_profile_id,entity_type,entity_id,action,metadata) values(new.id,'profile',new.id,'account.created',jsonb_build_object('source','supabase_auth'));
  return new;
end $$;
revoke all on function private.handle_auth_user_created() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_auth_user_created();

create or replace function private.handle_auth_user_verified() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into public.audit_events(actor_profile_id,entity_type,entity_id,action,metadata) values(new.id,'profile',new.id,'email.verified',jsonb_build_object('source','supabase_auth'));
  end if;
  return new;
end $$;
revoke all on function private.handle_auth_user_verified() from public,anon,authenticated;
drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified after update of email_confirmed_at on auth.users for each row execute function private.handle_auth_user_verified();

create policy memberships_self_read on public.tenant_memberships for select to authenticated using(profile_id=auth.uid() or private.is_platform_user());
create policy tenant_roles_member_read on public.tenant_roles for select to authenticated using(private.is_tenant_member(tenant_id) or private.is_platform_user());
create policy tenant_permissions_member_read on public.tenant_role_permissions for select to authenticated using(exists(select 1 from public.tenant_roles r where r.id=role_id and (private.is_tenant_member(r.tenant_id) or private.is_platform_user())));
commit;
