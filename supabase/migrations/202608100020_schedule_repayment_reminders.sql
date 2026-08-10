begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'zamloan-daily-repayment-reminders',
  '15 6 * * *',
  $job$select public.queue_due_repayment_reminders(current_date)$job$
);
commit;
