begin;
do $$ declare definition text; begin
  select pg_get_functiondef('public.record_loan_disbursement(uuid,bigint,text,text,timestamp with time zone)'::regprocedure) into definition;
  definition:=replace(definition,' instalment_no int;','');
  execute definition;
end $$;
commit;
