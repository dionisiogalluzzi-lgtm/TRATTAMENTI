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
| 20260818190720 | `qdca_geospatial_and_standardized_rate` |
| 20260819053802 | `ministerial_fitosanitary_catalog` |
| 20260819053933 | `ministerial_sync_security_and_refresh` |
| 20260819054030 | `schedule_ministry_catalog_weekly_sync` |
| 20260819054459 | `route_ministry_sync_via_vercel` |
| 20260819054521 | `bootstrap_ministry_catalog_sync` |
| 20260819054554 | `admin_ministry_sync_trigger` |
| 20260819055228 | `use_public_production_alias_for_ministry_sync` |
| 20260819055355 | `allow_service_role_private_sync_helpers` |
| 20260819055440 | `recognize_all_current_ministerial_authorization_statuses` |
| 20260819055536 | `move_pg_trgm_to_extensions_schema` |
| 20260819055636 | `prevent_invalid_ministerial_products_from_becoming_active` |
| 20260819154436 | `auditable_compliance_overrides_and_product_cleanup` |
| 20260819154953 | `index_compliance_override_foreign_keys` |

## Ministry of Health phytosanitary catalog

- Official Open Data is imported into `ministerial_products` and remains separate from the smaller farm catalog in `products`.
- Initial production synchronization completed successfully from dataset date `2026-08-17`: 17,695 official records received/upserted.
- Search supports commercial name, registration number and active substance.
- ADMIN can add an official product to the farm catalog; official status and authorization expiry are retained and refreshed.
- Products whose official state is revoked, expired, suspended or otherwise not current are never activated for treatment planning.
- A weekly job `weekly-ministry-fitosanitari-sync` is active at `15 4 * * 2` (Tuesday 04:15 UTC).
- The synchronization secret is stored in Supabase Vault and is not committed to the repository.
- Full structured label-use rules are not inferred from the Open Data catalog; those remain versioned/verified separately in `product_labels` and `product_crop_rules`.

## Compliance overrides and QDCA audit

- ADMIN can explicitly force a treatment whose current label checks contain `BLOCKING` findings, but only with a recorded reason.
- The override is tied to a deterministic signature of the current blocking checks, so a materially changed set of checks invalidates the previous authorization.
- At execution start, compliance findings are snapshotted into `treatment_execution_compliance_issues` and never inferred retroactively from mutable master data.
- `v_qdca_records` includes all completed real uses and exposes `CONFORME` / `NON_CONFORME`, issue codes/messages and the override reason.
- A filtered conforming view can be produced by the UI/export, but it is explicitly treated as an internal view and not as a substitute for the complete record of actual use.
- Catalog products can be deleted only while unused; products already referenced by operational history are archived (`active=false`) instead of being physically deleted.

## Verification state

- RLS enabled on all application tables in the exposed `public` schema.
- Public views use `security_invoker = true`.
- Privileged implementations are in `app_private`; exposed RPC wrappers are `SECURITY INVOKER`.
- `anon` cannot execute privileged application RPCs.
- `pg_trgm` is installed in the dedicated `extensions` schema.
- Supabase Security Advisor has no database-schema findings after the Ministry hardening; the remaining Auth-level warning is leaked-password protection, configurable in Supabase Auth settings.
- Performance Advisor currently reports only informational unused-index notices expected on a new/low-volume operational database; FK/search indexes are intentionally retained for the expected workload.
- `farm-documents` storage bucket is private and protected by company-scoped policies.

## Rule for future changes

Every DDL/security change must be applied as a named Supabase migration, followed by Security Advisor and Performance Advisor checks. Update this history when new migrations are applied.
