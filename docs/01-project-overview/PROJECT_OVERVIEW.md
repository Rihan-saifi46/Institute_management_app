# Project Overview: Computer Institute Management System

## 1. Executive Summary

The **Computer Institute Management System** is a responsive web application engineered to streamline administrative operations for a private computer coaching institute. The system centralizes student records, tracks course fee collections with an immutable financial ledger, issues browser-native printable fee receipts, and provides a 15-second batch attendance interface.

The application is architected around a strict **₹0 upfront investment and ₹0 ongoing operating expenditure** baseline, utilizing the free tiers of **Supabase (PostgreSQL + Supabase Auth + PostgREST)**, **Cloudflare Pages**, **Cloudflare R2**, and **GitHub**.

---

## 2. Business Problem & Objectives

### 2.1 Core Problems Faced by the Institute
* **Fragmented Student Records:** Managing student admissions across paper registers and disjointed spreadsheets leads to data entry errors, lost contact numbers, and lack of historical visibility.
* **Fee Collection Leakage & Tracking Errors:** Unclear tracking of installment payments, partial balances, and overdue fees results in delayed or missed collections and lack of verifiable audit trails.
* **Cumbersome Attendance Workflows:** Calling out names and marking attendance one-by-one on paper registers consumes significant classroom and administrative time.
* **Receipting Overhead:** Writing manual paper receipts is time-consuming, prone to calculation errors, and lacks an immediate searchable digital audit trail.

### 2.2 Core Business Objectives
1. **Authoritative Student Registry:** Maintain a searchable digital registry of all admitted students with manual Admission IDs.
2. **Audit-Grade Fee Ledger:** Maintain an immutable record of all payments, authorized reversals, remaining balances, and payment history in real time.
3. **Streamline Daily Attendance:** Provide a 15-second batch attendance interface with built-in duplicate prevention.
4. **Strict Access Security:** Restrict all management functionality to verified administrative personnel with zero public data exposure.
5. **Data Sovereignty & Safety:** Implement daily automated off-site encrypted database backups and verifiable disaster recovery procedures independent of cloud hosting providers.
6. **Zero Running Cost:** Operate sustainably within verified cloud free tiers without recurring software subscriptions or hidden costs.

---

## 3. High-Level System Architecture Summary

The system is structured as a secure, decoupled web application:

* **Presentation Layer:** Single Page Application (SPA) built with React.js (Vite) and Tailwind CSS, hosted globally on **Cloudflare Pages**.
* **Backend as a Service & Database:** **Supabase PostgreSQL**, providing native relational integrity, PostgREST instant RESTful data APIs, built-in **Supabase Auth**, and engine-level **Row Level Security (RLS)**.
* **Direct Client Integration:** The React frontend interacts directly with Supabase via `@supabase/supabase-js` using standard HTTPS, public anon keys, and user JWTs. No intermediate custom proxy worker is required for standard CRUD operations.
* **Trusted Business Logic:** Atomic multi-statement operations (such as batch attendance marking and payment reversals) are executed via trusted PostgreSQL stored functions (`rpc`).
* **Data Safety & Off-Site Backups:** Automated daily full PostgreSQL dumps (`pg_dump`) executed via **GitHub Actions**, AES-256 encrypted with GPG, and stored in **Cloudflare R2** (primary) and an independent secondary storage destination.

---

## 4. Platform Selection: Historical Note on Neon vs. Supabase

During architectural evaluation, **Neon Serverless PostgreSQL** was investigated primarily for its automatic compute scale-to-zero and seamless ~500ms auto-wake-up behavior. 

However, after thorough evaluation, **Supabase** was selected as the preferred platform based on owner priorities:
1. **Operational Simplicity:** Supabase provides a unified, production-tested platform combining PostgreSQL, Auth (GoTrue), PostgREST, and an intuitive management dashboard (Table Editor and SQL Studio) in a single service.
2. **Elimination of Intermediate Proxy Layer:** By leveraging Supabase's battle-tested PostgREST API with strict Row Level Security (RLS), the application eliminates the need to develop, configure, and maintain a separate Cloudflare Worker API gateway for ordinary CRUD operations.
3. **Data Recovery & Ecosystem Stability:** Supabase provides standard direct PostgreSQL connection strings compatible with all standard backup tools (`pg_dump`, `psql`), standard migration tooling, and a mature community.
4. **Inactivity Handling Clarification:** While Supabase Free projects pause after 7 consecutive days of inactivity, **pausing is not deletion**. Data remains completely intact, and restoring a paused project takes 2 to 4 minutes via a single click in the Supabase dashboard. Routine daily institute operations naturally prevent pausing during active academic terms.

---

## 5. Key Operational Constraints

| Constraint | Specification | Rationale |
| :--- | :--- | :--- |
| **Budget** | Strict ₹0 initial and ongoing | Self-funded small business; must remain entirely on free tiers. |
| **Target Scale** | Single institute, 50–500 active students | Sized for local computer coaching institute operations. |
| **User Base** | 1–3 administrative users (Owner & Managers) | No student or public user accounts in MVP. |
| **Admission IDs** | Manually entered text IDs | Institute assigns its own established roll/admission codes. |
| **Course Modeling** | Unstructured text fields | Courses evolve frequently; avoids administrative overhead in MVP. |
| **Financial Ledger** | Strictly immutable with reversal entries | Prevents silent data tampering and preserves complete accounting audit trails. |
| **Data Safety** | Daily automated encrypted off-site backups | Protects against accidental deletion, provider outages, or account compromise. |

---

## 6. Stakeholder Directory

* **Institute Owner (Super Admin):** Primary decision-maker, responsible for fee policy, administrator user creation, authorized payment reversals, data auditing, and disaster recovery verification.
* **Institute Manager (Admin):** Daily operator, responsible for registering new students, collecting fee installments, printing receipts, and marking daily attendance.
* **Engineering / Maintenance Agent:** Responsible for architecture compliance, security auditing, schema migrations, and deployment automation.
