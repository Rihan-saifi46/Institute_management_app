# Architectural & Implementation Decisions Register

This document tracks all formal architectural choices, owner approvals, and implementation policies.

---

## Decision Matrix Summary

| Decision ID | Summary Question | Approved / Final Choice | Status |
| :---: | :--- | :--- | :---: |
| **DEC-001** | Database Access & Architecture Pattern | Direct Supabase Client + PostgREST with strict RLS for ordinary CRUD; PostgreSQL Stored Functions (RPC) for atomic batch attendance & reversals. No intermediate Worker. | **APPROVED** |
| **DEC-002** | Admission ID Uniqueness & Normalization | Case-insensitive and trimmed uniqueness index (`LOWER(TRIM(admission_id))`) with matching client validation while preserving visual casing. | **APPROVED** |
| **DEC-003** | Inactive Student Management Policy | Status column lifecycle flag (`active`, `completed`, `dropped`) preserving complete historical attendance and payment records. | **APPROVED** |
| **DEC-004** | Fee Payment Immutability & Void Policy | Immutable payment ledger. Never edit or delete past payment records. Authorized reversal entries referencing original ID with mandatory reason, restricted to `super_admin`. | **APPROVED WITH MODIFICATION** |
| **DEC-005** | Intermediate Worker / Router Framework | Not applicable. Omitted because direct Supabase client + PostgreSQL RPCs eliminates the need for an intermediate Worker layer. | **NOT APPLICABLE / SUPERSEDED** |
| **DEC-006** | Off-Site Automated Backup Storage | Daily automated GPG AES-256 encrypted backups to Cloudflare R2 (primary, 10 GB free) with a secondary duplicate copy in an independent provider (GitHub Releases). | **APPROVED WITH MODIFICATION** |

---

## Detailed Decision Specifications

### DEC-001: Database Access & Architecture Pattern
* **Decision:** Use direct Supabase JavaScript Client (`@supabase/supabase-js`) with PostgREST over HTTPS for ordinary CRUD operations, protected by PostgreSQL Row Level Security (RLS).
* **Server-Side Logic:** Atomic multi-statement workflows (such as batch attendance upserts and payment reversals) are executed via trusted PostgreSQL stored functions (`rpc`).
* **Worker Elimination:** A separate Cloudflare Worker proxy layer is omitted because Supabase provides direct, secure, high-performance REST APIs out of the box with zero additional maintenance.
* **Status:** **APPROVED**

---

### DEC-002: Admission ID Uniqueness & Case Sensitivity
* **Decision:** Enforce normalized case-insensitive uniqueness at the database engine level using an expression-based index:
  ```sql
  CREATE UNIQUE INDEX unique_trimmed_lower_admission_id 
  ON public.students (LOWER(TRIM(admission_id)));
  ```
* **Application Validation:** Client-side forms trim and check normalized values before submission.
* **Preservation:** The original letter casing entered by the institute staff (e.g., `CIT-2026/01`) is preserved in the column for display and receipt generation.
* **Status:** **APPROVED**

---

### DEC-003: Inactive Student Management Policy
* **Decision:** Manage student lifecycles using an explicit `status` column constrained to `('active', 'completed', 'dropped')`.
* **Historical Integrity:** Records of students who graduate or drop out are permanently preserved in the database.
* **Attendance Filtering:** Daily batch attendance sheets filter strictly for `status = 'active'`.
* **Status:** **APPROVED**

---

## DEC-004: Fee Payment Immutability & Void/Reversal Policy
* **Decision:** The fee payment table (`public.fee_payments`) is strictly **append-only**.
* **Immutability Guarantee:** PostgreSQL RLS policies revoke all `UPDATE` and `DELETE` permissions on `fee_payments` for all users.
* **Authorized Reversals:** If a payment was recorded in error (e.g. check bounced, wrong student, typo in amount), an authorized reversal entry must be inserted:
  - Restricted strictly to `super_admin` (Institute Owner) via `public.reverse_payment` RPC.
  - Generates a new row with `is_reversal = true`, `reversal_of_id = <original_id>`, mandatory `void_reason` ($\ge 5$ characters), and actor ID.
  - The real-time view `student_fee_summary` dynamically nets out reversals (`CASE WHEN is_reversal THEN -amount ELSE amount END`).
* **Status:** **APPROVED WITH MODIFICATION**

---

### DEC-005: Cloudflare Worker / Router Framework
* **Decision:** **Not Applicable**. Because DEC-001 approved direct Supabase Client access with PostgreSQL stored functions, an intermediate Cloudflare Worker API gateway is unnecessary. Frameworks like Hono are not required for the MVP.
* **Status:** **NOT APPLICABLE / SUPERSEDED**

---

### DEC-006: Off-Site Automated Backup Storage
* **Decision:** Automated daily full PostgreSQL dumps (`pg_dump`) executed via GitHub Actions and encrypted using GPG (AES-256):
  1. **Primary Destination:** Cloudflare R2 bucket (`institute-backups-prod`), providing 10 GB free storage with zero egress bandwidth charges.
  2. **Secondary Destination:** Duplicate copy stored in an independent provider / infrastructure (GitHub Private Releases) to guard against account compromise.
* **Retention Policy:** 30 daily rolling backups and 12 monthly archival backups.
* **Status:** **APPROVED WITH MODIFICATION**
