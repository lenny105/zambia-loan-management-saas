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

  update public.email_outbox as target
  set status = 'processing', attempt_count = target.attempt_count + 1,
      next_attempt_at = now(), last_error = null
  where target.id = claimed.id;

  return query select claimed.id, claimed.recipient, claimed.subject, claimed.message_type,
    claimed.template_version, claimed.payload, claimed.idempotency_key, claimed.attempt_count + 1;
end;
$$;

revoke all on function public.claim_email_outbox() from public, anon, authenticated;
grant execute on function public.claim_email_outbox() to service_role;

commit;
