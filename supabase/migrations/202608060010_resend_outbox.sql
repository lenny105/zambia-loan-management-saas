begin;

create or replace function public.claim_email_outbox()
returns table (
  outbox_id uuid,
  recipient text,
  subject text,
  message_type text,
  template_version int,
  payload jsonb,
  idempotency_key text,
  attempt_count int
)
language plpgsql
security definer
set search_path = ''
as $$
declare claimed public.email_outbox%rowtype;
begin
  select e.* into claimed
  from public.email_outbox e
  where (
      e.status in ('queued', 'failed')
      or (e.status = 'processing' and e.next_attempt_at < now() - interval '15 minutes')
    )
    and e.next_attempt_at <= now()
    and e.attempt_count < 5
  order by e.next_attempt_at, e.created_at
  for update skip locked
  limit 1;
  if not found then return; end if;

  update public.email_outbox
  set status = 'processing', attempt_count = attempt_count + 1, next_attempt_at = now(), last_error = null
  where id = claimed.id;

  return query select claimed.id, claimed.recipient, claimed.subject, claimed.message_type,
    claimed.template_version, claimed.payload, claimed.idempotency_key, claimed.attempt_count + 1;
end;
$$;

create or replace function public.complete_email_outbox(target_outbox_id uuid, target_provider_message_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_provider_message_id is null or target_provider_message_id = '' then
    raise exception 'Provider message ID is required';
  end if;
  update public.email_outbox
  set status = 'sent', provider_message_id = target_provider_message_id, sent_at = now(), last_error = null
  where id = target_outbox_id and status = 'processing';
  if not found then raise exception 'Processing outbox message not found'; end if;

  insert into public.email_messages(outbox_id, provider_message_id, status)
  values(target_outbox_id, target_provider_message_id, 'sent')
  on conflict(outbox_id) do update set provider_message_id = excluded.provider_message_id;
end;
$$;

create or replace function public.fail_email_outbox(target_outbox_id uuid, safe_error text, retryable boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare attempts int;
begin
  select attempt_count into attempts from public.email_outbox where id = target_outbox_id for update;
  update public.email_outbox
  set status = case when retryable and attempts < 5 then 'failed'::public.outbox_status else 'requires_review'::public.outbox_status end,
      next_attempt_at = case when retryable and attempts < 5 then now() + make_interval(mins => least(60, power(2, attempts)::int)) else next_attempt_at end,
      last_error = left(safe_error, 500)
  where id = target_outbox_id and status = 'processing';
end;
$$;

create or replace function private.process_email_webhook_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare current_status public.outbox_status;
begin
  select status into current_status from public.email_messages where provider_message_id = new.provider_message_id for update;
  if not found then return new; end if;

  if new.event_type = 'email.delivered' then
    update public.email_messages set status = 'delivered' where provider_message_id = new.provider_message_id;
    update public.email_outbox set status = 'delivered' where provider_message_id = new.provider_message_id;
  elsif new.event_type in ('email.bounced', 'email.complained', 'email.suppressed') then
    update public.email_messages set status = 'requires_review' where provider_message_id = new.provider_message_id;
    update public.email_outbox set status = 'requires_review', last_error = replace(new.event_type, 'email.', '')
    where provider_message_id = new.provider_message_id;
  elsif new.event_type = 'email.failed' and current_status not in ('delivered', 'requires_review') then
    update public.email_messages set status = 'failed' where provider_message_id = new.provider_message_id;
    update public.email_outbox set status = 'failed', last_error = 'provider_delivery_failed'
    where provider_message_id = new.provider_message_id;
  end if;
  return new;
end;
$$;

drop trigger if exists process_email_webhook_insert on public.email_webhook_events;
create trigger process_email_webhook_insert before insert on public.email_webhook_events
for each row execute function private.process_email_webhook_insert();

revoke all on function public.claim_email_outbox() from public, anon, authenticated;
revoke all on function public.complete_email_outbox(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_email_outbox(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_email_outbox() to service_role;
grant execute on function public.complete_email_outbox(uuid, text) to service_role;
grant execute on function public.fail_email_outbox(uuid, text, boolean) to service_role;

commit;
