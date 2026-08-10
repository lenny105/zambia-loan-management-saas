begin;

insert into public.subscription_plans (id, code, name, active)
values
  ('10000000-0000-4000-8000-000000000001', 'starter', 'Starter', true),
  ('10000000-0000-4000-8000-000000000002', 'growth', 'Growth', true),
  ('10000000-0000-4000-8000-000000000003', 'professional', 'Professional', true)
on conflict (code) do nothing;

insert into public.plan_versions (
  id, plan_id, version, monthly_price_minor, annual_price_minor,
  currency, effective_from, publicly_available, grace_days
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 49900, 499000, 'ZMW', '2026-08-06', true, 3),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1, 99900, 999000, 'ZMW', '2026-08-06', true, 5),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 1, 199900, 1999000, 'ZMW', '2026-08-06', true, 7)
on conflict (plan_id, version) do nothing;

insert into public.plan_entitlements (plan_version_id, entitlement, limit_value, enabled)
values
  ('20000000-0000-4000-8000-000000000001', 'users', 2, true),
  ('20000000-0000-4000-8000-000000000001', 'branches', 1, true),
  ('20000000-0000-4000-8000-000000000002', 'users', 5, true),
  ('20000000-0000-4000-8000-000000000002', 'branches', 3, true),
  ('20000000-0000-4000-8000-000000000003', 'users', 12, true),
  ('20000000-0000-4000-8000-000000000003', 'branches', 8, true)
on conflict (plan_version_id, entitlement) do nothing;

commit;
