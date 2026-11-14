# System Architecture

## 1. Architectural Overview

The Computer Institute Management System employs a clean, two-tier serverless architecture designed for maximum operational simplicity, zero operating cost, high reliability, and strong data safety.

By utilizing **Supabase (PostgreSQL + PostgREST + Supabase Auth)** directly with **Cloudflare Pages**, the application eliminates the overhead, latency, and maintenance burden of an intermediate proxy server or custom Cloudflare Worker for ordinary CRUD operations.

```mermaid
flowchart TD
    subgraph Client["Presentation Tier (Client Devices)"]
        Browser["Modern Web Browser (Desktop / Tablet / Mobile)"]
        SPA["React SPA (Vite + Tailwind CSS + Lucide)"]
        AuthContext["Supabase Auth Context (Session / JWT Cache)"]
        Browser --> SPA
        SPA --> AuthContext
    end

    subgraph CDN["Static Hosting Tier (Cloudflare Pages)"]
        CF_Pages["Cloudflare Pages Global Edge CDN"]
        GitRepo["Private GitHub Repository"]
        GitRepo -->|Automated CI/CD Build on Push| CF_Pages
        CF_Pages -->|Serves Static HTML/JS/CSS Bundle| Browser
    end

    subgraph BaaS["Backend & Database Tier (Supabase)"]
        SupaAuth["Supabase Auth (GoTrue - JWT Issue & Validation)"]
        PostgREST["PostgREST Auto-Generated REST API"]
        RPC["PostgreSQL Database Functions (RPC)"]
        RLS["PostgreSQL Row Level Security Engine"]
        
        subgraph Postgres["PostgreSQL Database"]
            T_Admins["admins"]
            T_Students["students"]
            T_Payments["fee_payments (Immutable Ledger)"]
            T_Attendance["attendance"]
            V_Summary["student_fee_summary (VIEW)"]
        end

        AuthContext -->|1. Sign in with Email/Password| SupaAuth
        SupaAuth -->|2. Returns JWT Access Token| AuthContext
        SPA -->|3. Direct HTTPS Queries with Bearer JWT| PostgREST
        SPA -->|4. Call Stored RPCs (Batch Attendance, Reversals)| RPC
        PostgREST --> RLS
        RPC --> RLS
        RLS --> Postgres
    end

    subgraph DataSafety["Automated Backup & Disaster Recovery Pipeline"]
        GHA["GitHub Actions (Scheduled Daily Cron)"]
        PGDump["pg_dump Utility"]
        GPG["GPG Symmetric Encryption (AES-256)"]
        R2["Primary: Cloudflare R2 (Encrypted Backup Bucket)"]
        Secondary["Secondary: Independent Cloud Storage"]

        GHA -->|1. Trigger Daily Dump| PGDump
        PGDump -->|2. Stream Full DB Snapshot| Postgres
        PGDump -->|3. Pipe Plaintext Dump| GPG
        GPG -->|4. Push Encrypted .sql.gpg| R2
        GPG -->|5. Push Duplicate Copy| Secondary
    end
```

---

## 2. Architectural Tiers

### 2.1 Presentation Tier (Cloudflare Pages + React)
* **Technology:** React.js initialized with Vite, styled with Tailwind CSS, and iconified with Lucide React.
* **Hosting:** Cloudflare Pages (Free Tier: unlimited bandwidth, 500 builds/month, global anycast CDN).
* **Delivery:** Pure static assets (pre-compiled HTML, JavaScript chunks, CSS). Zero Node.js runtime required on the hosting server, eliminating server crashes and cold boots.
* **Routing:** Client-side routing via React Router DOM with protected route wrappers intercepting unauthenticated navigation.

### 2.2 Backend & Data Tier (Supabase)
* **Direct Client Access (No Intermediate Worker):** The React frontend queries Supabase directly using `@supabase/supabase-js`. The public Supabase URL and anonymous key (`anon_key`) are bundled in the frontend. This is secure because **all table access is strictly gated by PostgreSQL Row Level Security (RLS)**.
* **PostgREST API:** Supabase automatically generates OpenAPI-compliant RESTful endpoints directly from PostgreSQL tables and views, providing filtering, sorting, and pagination without custom backend boilerplate.
* **Database Functions (RPC):** Atomic, multi-step operations that require transaction isolation or elevated validation are implemented directly inside PostgreSQL as stored functions:
  - `public.mark_batch_attendance(p_date, p_records)`: Atomic batch attendance upsert.
  - `public.reverse_payment(p_payment_id, p_reason)`: Authorized payment reversal with audit logging.
* **Supabase Auth:** Built-in JWT-based identity management, automatically verifying user sessions and passing `auth.uid()` into PostgreSQL session context for RLS evaluation.

### 2.3 Off-Site Data Safety Pipeline
* **Isolation from Primary Host:** Backups run independently of Supabase via automated GitHub Actions runners.
* **Primary Storage:** **Cloudflare R2** (S3-compatible, zero egress fees, 10 GB free storage).
* **Secondary Storage:** Independent off-site backup storage (e.g. GitHub Private Releases or separate cloud bucket) ensuring complete resilience against single-provider account compromise.

---

## 3. Communication Protocols & Security Boundaries

| Link | Protocol | Security Mechanism | Payload |
| :--- | :--- | :--- | :--- |
| **Client ↔ Cloudflare Pages** | HTTPS (TLS 1.3) | Global SSL certificate managed by Cloudflare | Compiled HTML, JS, CSS |
| **Client ↔ Supabase Auth** | HTTPS (TLS 1.3) | Supabase `anon_key` + SSL | User credentials, session JWTs |
| **Client ↔ Supabase PostgREST / RPC** | HTTPS (TLS 1.3) | Bearer Token (`JWT`) + `anon_key` | JSON REST requests / RPC payloads |
| **GitHub Actions ↔ Supabase Postgres** | TLS Encrypted TCP (Port 5432 / 6543) | Direct PostgreSQL connection string in GitHub Secrets | Full database schema & data dump |
| **GitHub Actions ↔ Cloudflare R2** | HTTPS (TLS 1.3) | S3 API Credentials in GitHub Secrets | AES-256 encrypted `.sql.gpg` dump |

---

## 4. Inactivity & Project Health Clarification

On the Supabase Free Plan, projects pause after **7 consecutive days of zero API requests**.

### Operational Reality & Safeguards:
1. **Pausing is NOT Deletion:** Inactive pausing simply shuts down the database compute engine to save resources. **All tables, records, schemas, and configurations remain 100% intact** in cloud storage.
2. **Instant Restoration:** Unpausing a paused project requires clicking **"Restore Project"** in the Supabase Dashboard, which restores the database to an active state within 2 to 4 minutes.
3. **Daily Institute Use:** In a standard operating institute, daily attendance marking and fee collection naturally keep the project active Monday through Saturday.
4. **Independent Backups:** Because automated daily backups are stored externally in Cloudflare R2, the institute's data is never trapped or dependent on a single provider's uptime.

---

## 5. Architectural Invariants (Non-Negotiables)

1. **Strict Client-Side Credential Safety:** The Supabase `service_role` key must **never** appear in frontend code, client environment variables, or Git commits. Only the public `anon_key` is permitted on the client.
2. **Database-Level Authorization:** All data access is enforced by PostgreSQL Row Level Security (RLS). Frontend route guards are for UX only and are never considered security boundaries.
3. **Financial Immutability:** Records in `public.fee_payments` can never be updated or deleted. Corrections are made strictly via authorized reversal entries.
4. **Data Safety Sovereignty:** Database backups must be executed independently, encrypted with GPG AES-256, and stored across two independent off-site cloud providers.
