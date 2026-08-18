# Supabase migration history

Live project: `TRATTAMENTI` (`axjxyqjmjgotrzhgdrej`).

This file mirrors the migration history currently applied to the connected Supabase project. The live Supabase migration table remains the source of truth until full SQL migration snapshots are exported into this repository.

| Version | Migration |
|---|---|
| 20260818183227 | `initial_agricultural_core` |
| 20260818183503 | `secure_admin_bootstrap` |
| 20260818184546 | `document_storage_and_operator_uploads` |
| 20260818184749 | `plan_compliance_checks` |
| 20260818185242 | `lock_down_rpc_execute` |
| 20260818185352 | `rls_and_fk_performance_hardening` |
| 20260818190007 | `accurate_field_allocation_and_stock_views` |
| 20260818190037 | `enforce_inventory_units` |
| 20260818190338 | `move_privileged_rpc_implementations_private` |

## Verification state

- RLS enabled on all application tables in the exposed `public` schema.
- Public views use `security_invoker = true`.
- Privileged implementations are in `app_private`; exposed RPC wrappers are `SECURITY INVOKER`.
- `anon` cannot execute privileged application RPCs.
- Supabase Security Advisor: no current findings after the last hardening migration.
- Performance Advisor: only informational unused-index notices on the new/empty database; indexes are intentionally retained for future FK/query workloads.
- `farm-documents` storage bucket is private and protected by company-scoped policies.

## Rule for future changes

Every DDL/security change must be applied as a named Supabase migration, followed by Security Advisor and Performance Advisor checks. Update this history when new migrations are applied.
