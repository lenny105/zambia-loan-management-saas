# Architecture

The application is a Next.js App Router modular monolith backed by Supabase Auth, PostgreSQL, Storage, Edge Functions and scheduled jobs. Browser code receives only public Supabase configuration. Route handlers and Edge Functions own provider calls. PostgreSQL RLS is the tenant-isolation boundary; private-schema functions re-check authenticated membership.

Protected and request-specific routes use dynamic rendering. Netlify builds the real Next.js application without a SPA redirect. Money is always integer ngwee and operational presentation uses Africa/Lusaka.
