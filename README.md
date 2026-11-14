# Z Institute Management System

A lightweight, responsive web application for managing student enrollments, fee collections with an immutable audit ledger, browser-native receipt generation, and daily batch attendance tracking.

---

## Architecture Overview

* **Frontend:** React.js (Vite) + Tailwind CSS + Lucide Icons
* **Database & BaaS:** Supabase PostgreSQL (PostgREST API + Supabase Auth + RLS)
* **Hosting:** Cloudflare Pages (Free, edge CDN)
* **Primary Backup Storage:** Cloudflare R2 (Encrypted offsite S3-compatible storage)
* **Secondary Backup Storage:** GitHub Private Releases (Independent copy)
* **Budget & Cost:** Strict ₹0 initial and ongoing operating cost

---

## Directory Structure

```
institute_app/
├── client/                     # Frontend Single Page Application (React + Vite)
│   ├── .env.example            # Client-side environment template
│   └── src/                    # UI components, pages, context, services (Phase 3+)
├── migrations/                 # Sequential PostgreSQL DDL migration scripts (Phase 1)
│   └── README.md               # Migration standards and file conventions
├── docs/                       # Complete project documentation & runbooks
│   ├── 01-project-overview/    # Scope, vision, and role definitions
│   ├── 02-architecture/        # System design, tech stack, data models, and backups
│   ├── 03-implementation/      # Detailed phase plans (Phases 0 through 7)
│   ├── 04-database/            # DDL schemas, constraints, and relationships
│   ├── 05-quality-and-operations/# Security, testing, deployment, and restore runbooks
│   └── 06-project-tracking/    # Open decisions, changelog, status, and limitations
├── .env.example                # Root environment template
├── .gitignore                  # Strict credential, log, and artifact isolation rules
└── package.json                # Workspace orchestration scripts
```

---

## Implementation Phases

| Phase | Description | Status |
| :---: | :--- | :---: |
| **Phase 0** | **Project Foundation & Scaffolding** | **COMPLETED** |
| **Phase 1** | **Database DDL, Views, Functions & Supabase Auth** | PENDING AUTHORIZATION |
| **Phase 2** | **Supabase Client Integration & RPC Layer** | PENDING |
| **Phase 3** | **Frontend Foundation & Authentication Shell** | PENDING |
| **Phase 4** | **Module A1 – Student Management** | PENDING |
| **Phase 5** | **Module A2 – Fees & Printable Receipts** | PENDING |
| **Phase 6** | **Module B – Batch Attendance Management** | PENDING |
| **Phase 7** | **Backup Pipeline, Restore Verification & Deployment** | PENDING |

---

## Security & Data Safety Invariants

1. **Strict Credential Isolation:** No database passwords, private keys, or `service_role` keys are ever committed to version control or included in frontend client bundles.
2. **Database-Level Authorization:** All data tables are protected by PostgreSQL Row Level Security (RLS).
3. **Immutable Financial Ledger:** Payment records cannot be updated or deleted. Corrections are made via authorized reversals (`public.reverse_payment`) restricted to the `super_admin`.
4. **Asymmetric Off-Site Backups:** Automated daily backups are encrypted with an asymmetric GPG public key. The private decryption key is retained strictly offline by the owner.

---

## Documentation

Comprehensive project documentation is available in the [`docs/`](docs/) directory:
* [Master Implementation Plan](docs/03-implementation/MASTER_IMPLEMENTATION_PLAN.md)
* [System Architecture](docs/02-architecture/SYSTEM_ARCHITECTURE.md)
* [Database Schema](docs/04-database/DATABASE_SCHEMA.md)
* [Backup & Recovery Runbook](docs/05-quality-and-operations/BACKUP_RESTORE_RUNBOOK.md)
* [Open Decisions Register](docs/06-project-tracking/OPEN_DECISIONS.md)
