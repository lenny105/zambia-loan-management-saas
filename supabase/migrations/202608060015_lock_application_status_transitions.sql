begin;
drop policy if exists applications_borrower_draft_update on public.loan_applications;
commit;
