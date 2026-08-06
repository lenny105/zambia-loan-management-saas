begin;
create unique index one_live_subscription_per_tenant on public.tenant_subscriptions(tenant_id) where status not in('cancelled','expired');
create or replace function private.validate_subscription_invoice() returns trigger language plpgsql security definer set search_path='' as $$
declare expected_amount bigint; target_tenant uuid; verification_status public.tenant_status;
begin
 select s.tenant_id,case s.billing_period when 'monthly' then v.monthly_price_minor else v.annual_price_minor end into target_tenant,expected_amount from public.tenant_subscriptions s join public.plan_versions v on v.id=s.plan_version_id where s.id=new.subscription_id;
 select status into verification_status from public.tenant_verification_profiles where tenant_id=new.tenant_id;
 if target_tenant is null or target_tenant<>new.tenant_id then raise exception 'invoice subscription tenant mismatch'; end if;
 if verification_status<>'approved' then raise exception 'tenant verification must be approved before invoicing'; end if;
 if new.amount_minor<>expected_amount or new.currency<>'ZMW' then raise exception 'invoice amount or currency does not match the selected plan'; end if;
 return new;
end $$;
revoke all on function private.validate_subscription_invoice() from public,anon,authenticated;
create trigger validate_subscription_invoice before insert on public.subscription_invoices for each row execute function private.validate_subscription_invoice();
create or replace function private.protect_invoice_identity() returns trigger language plpgsql set search_path='' as $$ begin if old.tenant_id<>new.tenant_id or old.subscription_id<>new.subscription_id or old.invoice_number<>new.invoice_number or old.amount_minor<>new.amount_minor or old.currency<>new.currency or old.issued_at<>new.issued_at then raise exception 'confirmed invoice identity and totals are immutable'; end if; return new; end $$;
revoke all on function private.protect_invoice_identity() from public,anon,authenticated;
create trigger protect_invoice_identity before update on public.subscription_invoices for each row execute function private.protect_invoice_identity();
create or replace function private.protect_invoice_line() returns trigger language plpgsql set search_path='' as $$ begin if tg_op='DELETE' and exists(select 1 from public.subscription_invoices i where i.id=old.invoice_id and i.status='open') and not exists(select 1 from public.subscription_payment_attempts p where p.invoice_id=old.invoice_id) then return old; end if; raise exception 'invoice lines are immutable after payment begins'; end $$;
revoke all on function private.protect_invoice_line() from public,anon,authenticated;
create trigger protect_invoice_line before update or delete on public.subscription_invoice_lines for each row execute function private.protect_invoice_line();
commit;
