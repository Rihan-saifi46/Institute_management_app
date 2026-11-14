# Phase 0: Project Foundation & Environment Setup

## 1. Objective
Initialize the local workspace environment, configure Git version control, establish project folder scaffolding, configure tooling (Node.js, TypeScript, package management), and prepare environment files following strict credential isolation rules.

---

## 2. Scope
* Initialize Git version control in `d:\institute_app`.
* Configure root `.gitignore` to prevent any credential or build artifact leakage.
* Establish standard workspace directory structure separating the frontend client, database migrations, and project documentation.
* Configure root tooling and package management.

---

## 3. Out-of-Scope Items
* Writing application business logic or UI views.
* Provisioning cloud resources on Supabase or Cloudflare.
* Executing SQL migrations.

---

## 4. Prerequisites
* Node.js (v18.x or v20.x LTS) installed locally.
* Git installed locally.
* Written owner approval of the Master Implementation Plan.

---

## 5. Step-by-Step Tasks

### Task 0.1: Initialize Git Repository
```bash
git init
```

### Task 0.2: Configure `.gitignore`
Create a `.gitignore` ensuring that `.env`, `.env.local`, `node_modules`, `dist`, and backup dump files are never committed.

### Task 0.3: Directory Scaffolding
Establish the clean workspace structure:
```
institute_app/
  ├── client/             # React SPA (Vite + Tailwind CSS + Supabase JS Client)
  ├── migrations/         # Sequential PostgreSQL DDL scripts
  ├── docs/               # Project documentation (already created)
  ├── package.json        # Root package orchestration
  └── README.md           # Repository overview & setup instructions
```
*(Note: No intermediate worker directory is needed because the client talks directly to Supabase via PostgREST and RLS).*

### Task 0.4: Initialize Package Configuration
Configure root `package.json` with scripts for concurrent development (`dev`, `build`, `lint`).

---

## 6. Expected Files & Deliverables
* `.gitignore`
* `README.md`
* `package.json`
* Directory folders: `client/`, `migrations/`, `docs/`

---

## 7. Database Changes
* None in this phase.

---

## 8. Security Requirements
* Verify that `.env` files and sensitive local credentials are included in `.gitignore`.
* Verify that no API keys or local database passwords exist in committed files.

---

## 9. Testing Strategy
* Run `git status` to verify clean staging and absence of unignored temporary files.
* Verify directory structure matches defined layout.

---

## 10. Acceptance Criteria
* [ ] Git repository is initialized on the `main` branch.
* [ ] `.gitignore` is active and successfully ignores `.env` and `node_modules`.
* [ ] Scaffolding folders `client/`, `migrations/`, and `docs/` exist.
* [ ] Initial commit is created with message `chore: initial project scaffolding`.

---

## 11. Rollback Plan
* If directory initialization fails, remove initialized files (`rm -rf .git package.json`) and restart.

---

## 12. Dependencies on Previous Phases
* **Depends on:** Written owner sign-off on project architecture and documentation.
