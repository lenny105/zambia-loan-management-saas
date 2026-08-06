begin;
alter table public.tenant_licence_documents add column reviewed_by uuid references public.platform_users(id), add column reviewed_at timestamptz, add column rejection_reason text;
alter table public.verification_decisions add constraint one_decision_per_review unique(review_id);

insert into public.platform_roles(code,name,permissions) values
('super_admin','Platform Super Admin',array['verification.read','verification.review','verification.decide','tenant.suspend','audit.read','plans.manage','billing.read','support.manage']),
('operations','Platform Operations',array['verification.read','billing.read','plans.manage','support.manage']),
('compliance','Platform Compliance',array['verification.read','verification.review','verification.decide','tenant.suspend','audit.read']),
('finance','Platform Finance',array['billing.read']),('support','Platform Support',array['support.manage']),('auditor','Platform Auditor',array['verification.read','audit.read'])
on conflict(code) do update set name=excluded.name,permissions=excluded.permissions;

create or replace function private.apply_verification_decision() returns trigger language plpgsql security definer set search_path='' as $$
declare target_status public.tenant_status; current_status public.tenant_status;
begin
  select status into current_status from public.tenants where id=new.tenant_id for update;
  target_status:=case new.decision when 'request_information' then 'needs_information'::public.tenant_status when 'approve' then 'approved'::public.tenant_status when 'reject' then 'rejected'::public.tenant_status when 'suspend' then 'suspended'::public.tenant_status end;
  if new.decision='approve' and not exists(select 1 from public.tenant_licences l join public.tenant_licence_documents d on d.licence_id=l.id and d.tenant_id=l.tenant_id where l.tenant_id=new.tenant_id and l.expiry_date>=current_date and l.status='accepted' and d.review_status='accepted') then raise exception 'current accepted licence evidence required'; end if;
  update public.tenants set status=target_status,updated_at=now() where id=new.tenant_id;
  update public.tenant_verification_profiles set status=target_status,updated_at=now() where tenant_id=new.tenant_id;
  insert into public.tenant_status_history(tenant_id,from_status,to_status,reason,changed_by) select new.tenant_id,current_status,target_status,new.reason,profile_id from public.platform_users where id=new.decided_by;
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,reason,metadata) select new.tenant_id,profile_id,'verification_decision',new.id,'verification.'||new.decision,new.reason,'{}' from public.platform_users where id=new.decided_by;
  return new;
end $$;
revoke all on function private.apply_verification_decision() from public,anon,authenticated;
create trigger apply_verification_decision after insert on public.verification_decisions for each row execute function private.apply_verification_decision();

create or replace function private.audit_licence_document_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.review_status is distinct from new.review_status then
  insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,reason,metadata) select new.tenant_id,p.profile_id,'tenant_licence_document',new.id,'licence_document.'||new.review_status,new.rejection_reason,'{}' from public.platform_users p where p.id=new.reviewed_by;
 end if; return new;
end $$;
revoke all on function private.audit_licence_document_review() from public,anon,authenticated;
create trigger audit_licence_document_review after update of review_status on public.tenant_licence_documents for each row execute function private.audit_licence_document_review();
commit;
