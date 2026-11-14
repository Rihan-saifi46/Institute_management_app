# Project Changelog & Revision History

All notable changes, architectural pivots, and documentation milestones for the Computer Institute Management System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.3.0-p0] - 2026-11-14

### Added
* **Phase 0 Execution Completed:**
  - Initialized Git repository on `main` branch.
  - Configured comprehensive, multi-layered `.gitignore` preventing commits of `.env`, secrets, private keys, database dumps (`*.sql`, `*.dump`), and build artifacts.
  - Scaffolding established: `client/` and `migrations/` directories.
  - Root `.env.example` and `client/.env.example` templates created without real credentials.
  - Root `package.json` created with workspace scripts (`dev`, `build`, `preview`, `lint`).
  - Comprehensive repository `README.md` created.
* **Backup Architecture Hardening:**
  - Integrated **GPG Asymmetric Encryption**: backup workflow in GitHub Actions holds only the public encryption key (`GPG_PUBLIC_KEY`), while the private decryption key is kept strictly offline by the owner.
  - Documented GitHub Actions scheduled cron jitter safeguards and added manual trigger (`workflow_dispatch`).
  - Documented timestamp heartbeat metadata tracking (`latest_backup_timestamp.json`) and automated freshness alerts if the last successful backup exceeds 24 hours.
  - Documented pre-upload backup integrity verification gates (file size $\ge 10 \text{ KB}$, PostgreSQL header/trailer checks, SHA-256 checksum generation).
* **Owner Confirmed Metadata:**
  - Institute Display Name confirmed as **Z Institute**.
  - Backup failure notification email confirmed as **`saifirihan683@gmail.com`**.
  - Initial Super Admin email confirmed as **`saifirihan683@gmail.com`**.

---

## [0.2.0-plan] - 2026-11-14

### Changed & Finalized
* **Platform Finalization (Supabase Preference):** Finalized system architecture around **Supabase (PostgreSQL 15/16 + PostgREST + Supabase Auth)** and **Cloudflare Pages**, prioritizing operational simplicity, proven authentication, and direct client access.
* **Architecture Simplification (Worker Removal):** Omitted the intermediate Cloudflare Worker API gateway for ordinary CRUD in favor of direct `@supabase/supabase-js` client access with strict PostgreSQL Row Level Security (RLS) policies and trusted database stored functions (`rpc`).
* **Decision Status Updates:**
  - `DEC-001`: APPROVED — Direct Supabase Client + PostgREST with strict RLS; PostgreSQL stored functions for atomic batch operations.
  - `DEC-002`: APPROVED — Normalized case-insensitive unique index (`LOWER(TRIM(admission_id))`).
  - `DEC-003`: APPROVED — Student lifecycle status (`active`, `completed`, `dropped`) preserving historical data.
  - `DEC-004`: APPROVED WITH MODIFICATION — Immutable payment ledger with authorized reversal entries (`is_reversal`, `reversal_of_id`, `void_reason`) restricted to `super_admin`.
  - `DEC-005`: NOT APPLICABLE / SUPERSEDED — Intermediate Worker omitted.
  - `DEC-006`: APPROVED WITH MODIFICATION — Daily automated encrypted backups to Cloudflare R2 (primary) and GitHub Private Releases (secondary).

---

## [0.1.0-plan] - 2026-11-14

### Added
* Comprehensive 29-file architectural and implementation documentation suite under `docs/`.
* Phase-wise master implementation plan covering Phases 0 through 7.

---

## [0.0.1-init] - 2026-11-13

### Added
* Initial project objective analysis and feature scoping for Module A (Student & Fees) and Module B (Attendance).
