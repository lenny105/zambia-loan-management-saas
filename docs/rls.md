# Row-level security

All exposed tables have RLS enabled. Tenant policies derive access from `auth.uid()` membership through restricted helpers in the private schema. The browser cannot write subscription state or prices. Licence and billing buckets are private and tenant-prefixed. Service-role credentials remain server-only.

Before launch, database tests must use two tenants and prove read, write, inference and Storage denial across the boundary for every exposed module.
