begin;
alter table public.tenant_licences add constraint tenant_licences_tenant_id_id_unique unique(tenant_id,id);
alter table public.tenant_licence_documents add constraint licence_documents_tenant_licence_fk foreign key(tenant_id,licence_id) references public.tenant_licences(tenant_id,id);

insert into public.compliance_declarations(code,version,content_hash,effective_at)
values('lender_responsibility',1,encode(extensions.digest('I confirm that the lender remains responsible for licensing, credit decisions, disbursements, collections, collateral and legal compliance. EZER-X supplies software only.','sha256'),'hex'),now())
on conflict(code,version) do nothing;
insert into public.legal_document_versions(document_type,version,content_hash,effective_at)
values('terms',1,encode(extensions.digest('launch-review-required-terms-v1','sha256'),'hex'),now()),('privacy',1,encode(extensions.digest('launch-review-required-privacy-v1','sha256'),'hex'),now())
on conflict(document_type,version) do nothing;

create policy licence_documents_member_insert on public.tenant_licence_documents for insert to authenticated with check(private.is_tenant_member(tenant_id) and uploaded_by=auth.uid());
create policy legal_acceptances_self_read on public.legal_acceptances for select to authenticated using(profile_id=auth.uid() and private.is_tenant_member(tenant_id));

create or replace function private.enforce_onboarding_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status='draft' and new.status='submitted' then
    if not exists(select 1 from public.tenant_licences l join public.tenant_licence_documents d on d.tenant_id=l.tenant_id and d.licence_id=l.id where l.tenant_id=new.id) then raise exception 'licence evidence is required'; end if;
    if not exists(select 1 from public.legal_acceptances a join public.compliance_declarations d on d.id=a.declaration_id where a.tenant_id=new.id and d.code='lender_responsibility') then raise exception 'lender declaration acceptance is required'; end if;
    update public.tenant_verification_profiles set status='submitted',submitted_at=now(),updated_at=now() where tenant_id=new.id and status='draft';
    if not found then raise exception 'verification profile is not eligible for submission'; end if;
    insert into public.tenant_status_history(tenant_id,from_status,to_status,reason,changed_by) values(new.id,old.status,new.status,'Lender owner submitted onboarding',new.created_by);
    insert into public.audit_events(tenant_id,actor_profile_id,entity_type,entity_id,action,metadata) values(new.id,new.created_by,'tenant_onboarding',new.id,'onboarding.submitted','{}');
  end if;
  return new;
end $$;
revoke all on function private.enforce_onboarding_submission() from public,anon,authenticated;
create trigger enforce_onboarding_submission before update of status on public.tenants for each row execute function private.enforce_onboarding_submission();

create or replace function private.prevent_audit_mutation() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'audit events are append-only'; end $$;
drop trigger if exists audit_events_immutable on public.audit_events;
create trigger audit_events_immutable before update or delete on public.audit_events for each row execute function private.prevent_audit_mutation();
revoke all on function private.prevent_audit_mutation() from public,anon,authenticated;
commit;
