begin;

create or replace function public.claim_subscription_receipt_job()
returns table (
  job_id uuid,
  invoice_id uuid,
  tenant_id uuid,
  tenant_legal_name text,
  invoice_number text,
  plan_name text,
  billing_period text,
  amount_minor bigint,
  currency char(3),
  paid_at timestamptz,
  lenco_reference text,
  recipient text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.job_runs%rowtype;
begin
  select j.* into claimed_job
  from public.job_runs j
  where j.job_type like 'generate_subscription_receipt:%'
    and (j.status = 'queued' or (j.status = 'processing' and j.started_at < now() - interval '15 minutes'))
  order by j.started_at
  for update skip locked
  limit 1;

  if not found then return; end if;

  update public.job_runs
  set status = 'processing', started_at = now(), error_summary = null
  where id = claimed_job.id;

  return query
  select
    claimed_job.id,
    i.id,
    i.tenant_id,
    t.legal_name,
    i.invoice_number,
    p.name,
    s.billing_period,
    i.amount_minor,
    i.currency,
    i.paid_at,
    c.lenco_reference,
    owner_profile.email
  from public.subscription_invoices i
  join public.tenants t on t.id = i.tenant_id
  join public.tenant_subscriptions s on s.id = i.subscription_id
  join public.plan_versions pv on pv.id = s.plan_version_id
  join public.subscription_plans p on p.id = pv.plan_id
  join public.subscription_payment_attempts a on a.invoice_id = i.id and a.status = 'successful'
  join public.lenco_collections c on c.payment_attempt_id = a.id and c.status = 'successful'
  join public.profiles owner_profile on owner_profile.id = t.created_by
  where i.id = split_part(claimed_job.job_type, ':', 2)::uuid
    and i.status = 'paid';

  if not found then
    update public.job_runs
    set status = 'failed', completed_at = now(), error_summary = 'Paid invoice data not found'
    where id = claimed_job.id;
  end if;
end;
$$;

create or replace function public.complete_subscription_receipt_job(
  target_job_id uuid,
  target_invoice_id uuid,
  target_document_path text,
  target_document_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_invoice public.subscription_invoices%rowtype;
  target_collection public.lenco_collections%rowtype;
  receipt_id uuid;
  owner_email text;
begin
  select * into target_invoice
  from public.subscription_invoices
  where id = target_invoice_id and status = 'paid'
  for update;
  if not found then raise exception 'Paid invoice not found'; end if;

  if not exists (
    select 1 from public.job_runs
    where id = target_job_id
      and job_type = 'generate_subscription_receipt:' || target_invoice_id::text
      and status = 'processing'
  ) then raise exception 'Receipt job is not processing'; end if;

  select c.* into target_collection
  from public.lenco_collections c
  join public.subscription_payment_attempts a on a.id = c.payment_attempt_id
  where a.invoice_id = target_invoice_id and a.status = 'successful' and c.status = 'successful'
  order by c.created_at desc
  limit 1;
  if not found or target_collection.lenco_reference is null then raise exception 'Verified collection not found'; end if;
  if target_document_path = '' or target_document_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid document metadata'; end if;

  insert into public.subscription_receipts (
    tenant_id, invoice_id, receipt_number, amount_minor, currency,
    lenco_reference, paid_at, document_path, document_hash
  ) values (
    target_invoice.tenant_id,
    target_invoice.id,
    'RCP-' || replace(target_invoice.invoice_number, 'INV-', ''),
    target_invoice.amount_minor,
    target_invoice.currency,
    target_collection.lenco_reference,
    target_invoice.paid_at,
    target_document_path,
    target_document_hash
  )
  on conflict (invoice_id) do update
  set document_path = public.subscription_receipts.document_path
  returning id into receipt_id;

  select p.email into owner_email
  from public.tenants t join public.profiles p on p.id = t.created_by
  where t.id = target_invoice.tenant_id;

  insert into public.email_outbox (
    tenant_id, message_type, recipient, subject, template_version, payload, idempotency_key
  ) values (
    target_invoice.tenant_id,
    'subscription_receipt',
    owner_email,
    'Subscription receipt ' || ('RCP-' || replace(target_invoice.invoice_number, 'INV-', '')),
    1,
    jsonb_build_object('invoiceId', target_invoice.id, 'receiptId', receipt_id),
    'receipt:' || target_invoice.id::text
  ) on conflict (idempotency_key) do nothing;

  update public.job_runs
  set status = 'completed', completed_at = now(), error_summary = null
  where id = target_job_id;

  insert into public.audit_events (tenant_id, entity_type, entity_id, action, metadata)
  values (
    target_invoice.tenant_id,
    'subscription_receipt',
    receipt_id,
    'subscription_receipt.generated',
    jsonb_build_object('invoiceId', target_invoice.id, 'documentHash', target_document_hash)
  );
  return receipt_id;
end;
$$;

create or replace function public.fail_subscription_receipt_job(target_job_id uuid, safe_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.job_runs
  set status = 'failed', completed_at = now(), error_summary = left(safe_error, 250)
  where id = target_job_id and status = 'processing';
$$;

revoke all on function public.claim_subscription_receipt_job() from public, anon, authenticated;
revoke all on function public.complete_subscription_receipt_job(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_subscription_receipt_job(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_subscription_receipt_job() to service_role;
grant execute on function public.complete_subscription_receipt_job(uuid, uuid, text, text) to service_role;
grant execute on function public.fail_subscription_receipt_job(uuid, text) to service_role;

commit;
