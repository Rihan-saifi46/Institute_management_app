# Database Migrations

This directory contains sequential, deterministic PostgreSQL DDL migrations for **Z Institute**.

## Migration File Standards

1. Files follow a 4-digit sequential prefix: `0001_slug.sql`, `0002_slug.sql`, etc.
2. Every migration must be transactional and idempotent where practical.
3. Every migration must be paired with an encrypted pre-migration backup before being applied to production.

## Planned Migrations (Phase 1)
* `0001_initial_schema.sql`: Base tables (`admins`, `students`, `fee_payments`, `attendance`), constraints, and indexes.
* `0002_create_fee_summary_view.sql`: Real-time financial summary view netting reversals.
* `0003_create_stored_functions.sql`: Stored functions (`mark_batch_attendance`, `reverse_payment`).
* `0004_enable_rls_policies.sql`: Row Level Security policies.
* `0005_seed_super_admin.sql`: Initial Super Admin user bootstrap.
