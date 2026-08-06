begin;
do $$
declare definition text;
begin
  select pg_get_functiondef('public.create_loan_agreement(uuid)'::regprocedure) into definition;
  definition:=replace(definition,'encode(digest(snapshot::text,''sha256''),''hex'')','encode(extensions.digest(snapshot::text,''sha256''),''hex'')');
  execute definition;
  select pg_get_functiondef('public.record_loan_disbursement(uuid,bigint,text,text,timestamp with time zone)'::regprocedure) into definition;
  definition:=replace(definition,' n int;','');
  definition:=replace(definition,'for n in 1..target.term_months loop','for instalment_no in 1..target.term_months loop');
  definition:=replace(definition,'when n=target.term_months','when instalment_no=target.term_months');
  definition:=replace(definition,'target.id,n,','target.id,instalment_no,');
  definition:=replace(definition,'(n||'' months'')','(instalment_no||'' months'')');
  definition:=replace(definition,'when n=1','when instalment_no=1');
  execute definition;
end $$;
commit;
