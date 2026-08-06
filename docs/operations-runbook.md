# Operations runbook

Reconcile a payment by matching immutable invoice, amount in ngwee, ZMW currency, tenant, internal reference and Lenco status re-query. Never activate from a browser response. Failed jobs retain correlation references and are retried only after the cause is understood. Suspending a tenant records actor and reason and blocks live writes while preserving lawful read/export access. Restore backups into an isolated project, validate integrity and RLS, then follow the approved recovery plan.
