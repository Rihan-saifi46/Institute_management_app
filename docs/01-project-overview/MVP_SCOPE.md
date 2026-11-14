# MVP Scope & Feature Boundaries

## 1. Scope Definition Philosophy

The Minimum Viable Product (MVP) for the Computer Institute Management System is strictly scoped to deliver core administrative utility—student registration, fee tracking, and daily attendance—without unnecessary complexity. Features that do not directly support daily workflows are deferred to future versions to ensure rapid delivery, zero operational friction, and strict data safety.

---

## 2. In-Scope MVP Features

### 2.1 Administrative Authentication & Authorization
* **Single-Tenant Admin Authentication:** Secure email and password login powered by **Supabase Auth**.
* **Strict Admin-Only Access:** Closed system with no public registration or self-service sign-up forms.
* **Route Protection:** Client-side React route guards and PostgreSQL Row Level Security (RLS) blocking unauthorized requests.
* **Session Persistence:** Persistent authenticated sessions with secure JWT token storage and automated refresh.

### 2.2 Module A: Student & Fees Management
* **Manual Admission ID Entry:**
  - Mandatory, institute-defined Admission ID (e.g., `CIT-2026-001`, `AD-105`).
  - Strict case-insensitive uniqueness enforcement using normalized values (`LOWER(TRIM(admission_id))`).
  - Strict preservation of the entered identifier string for display and receipt generation.
* **Student Record Management:**
  - Full Name, Primary Phone Number, Course Name (plain text), Joining Date, Total Course Fee, Status (`active`, `completed`, `dropped`), and optional notes.
  - Internal UUID primary keys ensuring database referential integrity.
  - Edit existing student details (name, phone, course, fee, status).
  - Student archival lifecycle: Students who complete or drop courses have their status updated, preserving complete historical and financial audit trails.
* **Course Search & Filtering:**
  - Real-time client-side search by Student Name, Phone Number, and Admission ID.
  - Dynamic filter by Course name and Student Status.
* **Immutable Fee Collection & Tracking:**
  - Record payment installments with Amount, Date, Payment Mode (`cash`, `upi`, `bank_transfer`, `cheque`), optional Receipt Reference, and Remarks.
  - **Audit-Grade Immutability:** Original payment records can never be edited or deleted.
  - **Authorized Reversals/Voids:** Erroneous payments can only be corrected by recording an explicit reversal entry referencing the original payment ID with a mandatory justification reason, timestamp, and actor ID (restricted to `super_admin`).
  - Automated database-level calculation of `total_paid` and `balance_due` using a real-time SQL view that properly nets out reversal entries.
  - Payment status indicators: `PAID` (balance = 0), `PARTIAL` (balance > 0 and paid > 0), `UNPAID` (paid = 0).
  - Chronological payment and reversal ledger per student.
  - Pending Fees Directory: Dedicated view filtering students with outstanding dues.
* **Browser-Native Receipt Generation:**
  - Printable fee receipt modal formatted with Institute Header, Student Name, Admission ID, Course, Payment Mode, Installment Amount, and Remaining Balance.
  - Zero-cost, browser-native printing (`window.print()` with `@media print` styling) supporting physical print and "Save as PDF".

### 2.3 Module B: Attendance Management
* **Batch Attendance Marking:**
  - Date-based attendance sheet defaulting to the current calendar date.
  - Pre-populates all active students defaulted to "Present".
  - One-click toggling for absent students.
  - Summary metrics display before submission: Total Active, Total Present, Total Absent.
* **Duplicate Prevention:**
  - Hard PostgreSQL composite unique constraint `UNIQUE(student_id, date)` preventing duplicate records for the same student on a given calendar day.
* **Attendance Editing:**
  - If attendance has already been recorded for a selected date, the system loads existing records and allows in-place updates via atomic database upsert rather than duplicate inserts.
* **Attendance History & Analytics:**
  - Individual student attendance calendar and chronological log.
  - Basic monthly summary metrics (Total Classes, Present Days, Absent Days, Attendance Percentage).

### 2.4 Data Portability & Disaster Recovery
* **In-App Data Export (Data Portability):** 1-click administrative download of institute data (`students`, `fee_payments`, `attendance`) as structured JSON and CSV files.
  > [!NOTE]
  > In-app CSV/JSON exports provide user-level data portability. They are **not** substitutes for full, schema-compliant database backups.
* **Automated Disaster Recovery (Data Safety):** Daily automated full PostgreSQL dumps (`pg_dump`) executed via GitHub Actions, GPG encrypted, and stored across two independent cloud providers (Cloudflare R2 and a secondary destination).

---

## 3. Explicitly Out-of-Scope Features (Deferred to Future Versions)

The following features are intentionally **excluded** from the initial MVP:

| Feature Category | Deferred Item | Justification for Exclusion |
| :--- | :--- | :--- |
| **Authentication** | Student / Parent Portal | Significantly expands security boundary; requires managing hundreds of credentials. |
| **Authentication** | Multi-Factor Authentication (MFA) | Unnecessary complexity for a 1–2 user initial deployment. |
| **Course Modeling** | Predefined Course Catalog & Modules | Plain text course input is sufficient and provides maximum initial flexibility. |
| **Class Modeling** | Batch / Timing Management | Increases data model complexity; can be introduced in Phase 2 without schema rebuilds. |
| **Branch Management** | Multi-Branch / Franchise Support | The target user operates a single physical institute location. |
| **Payments** | Payment Gateway Integration (Razorpay, Stripe) | Requires business KYC, transaction fees (1.5%–2%), and webhook infrastructure. |
| **Messaging** | Automated SMS / WhatsApp / Email Reminders | Incurs third-party API costs (Twilio, Gupshup, Meta WhatsApp Business API). |
| **Files** | Student Profile Photo Uploads | Requires cloud object storage integration; deferred to post-MVP. |
| **Analytics** | Advanced BI Charts & Predictive Reporting | Basic table summaries and metric cards satisfy all immediate operational needs. |

---

## 4. Scope Governance & Change Control

1. Any request to introduce an out-of-scope feature during MVP development must be formally documented in `docs/06-project-tracking/OPEN_DECISIONS.md`.
2. No code, schema alterations, or package installations supporting out-of-scope items may be introduced without written owner sign-off.
3. Feature additions must not breach the strict ₹0 operating cost threshold.
