# Database Constraints & Business Validation Rules

## 1. Overview

To guarantee that application-level software bugs or frontend validation bypasses cannot corrupt institute data, all fundamental business rules are enforced as **hard constraints** in the PostgreSQL engine.

---

## 2. Table-by-Table Constraint Matrix

| Table | Constraint Name | Constraint Type | SQL Definition | Business Rule Enforced |
| :--- | :--- | :--- | :--- | :--- |
| `admins` | `admins_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` | Ensures unique internal admin UUID. |
| `admins` | `admins_user_id_key` | UNIQUE | `UNIQUE (user_id)` | Prevents duplicate profile mapping for a single auth user. |
| `admins` | `admins_email_key` | UNIQUE | `UNIQUE (email)` | Guarantees unique admin email addresses. |
| `admins` | `admins_role_check` | CHECK | `CHECK (role IN ('super_admin', 'admin'))` | Restricts roles strictly to valid administrative tiers. |
| `students` | `students_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` | Unique internal student UUID. |
| `students` | `unique_trimmed_lower_admission_id` | UNIQUE INDEX | `UNIQUE (LOWER(TRIM(admission_id)))` | **Guarantees case-insensitive unique Admission IDs.** |
| `students` | `check_total_fee_positive` | CHECK | `CHECK (total_fee >= 0)` | **Total course fee cannot be negative.** |
| `students` | `students_status_check` | CHECK | `CHECK (status IN ('active', 'completed', 'dropped'))` | Enforces valid student status lifecycles. |
| `students` | `check_admission_id_not_empty`| CHECK | `CHECK (length(trim(admission_id)) > 0)` | Disallows empty or whitespace-only Admission IDs. |
| `students` | `check_name_not_empty` | CHECK | `CHECK (length(trim(name)) > 0)` | Student name cannot be blank. |
| `fee_payments` | `fee_payments_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` | Unique internal payment transaction UUID. |
| `fee_payments` | `check_payment_amount_positive`| CHECK | `CHECK (amount > 0)` | **Payment installments must be strictly greater than zero.** |
| `fee_payments` | `fee_payments_mode_check` | CHECK | `CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque'))` | Restricts payment methods to verified channels. |
| `fee_payments` | `check_reversal_integrity`| CHECK | Complex condition (see below) | **Guarantees reversal records have reason and linked ID.** |
| `attendance` | `attendance_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` | Unique internal attendance log UUID. |
| `attendance` | `unique_student_daily_attendance`| UNIQUE | `UNIQUE (student_id, date)` | **Prevents duplicate attendance for the same student and date.** |
| `attendance` | `attendance_status_check`| CHECK | `CHECK (status IN ('present', 'absent'))` | Attendance status must be strictly 'present' or 'absent'. |

---

## 3. Deep Dive: Normalized Admission ID Uniqueness

### 3.1 The Problem of Case and Whitespace Discrepancies
In manual data entry, human error can result in subtle discrepancies:
- Manager A enters: `CIT-101`
- Manager B later enters: `cit-101`
- Manager C enters: `  CIT-101  `

### 3.2 Implemented Normalized Constraint
The database implements an expression-based unique index:

```sql
CREATE UNIQUE INDEX unique_trimmed_lower_admission_id 
ON public.students (LOWER(TRIM(admission_id)));
```

* **User Experience:** The user's exact case formatting (e.g. `CIT-2026/01`) is preserved in the column for display and receipt printing.
* **Integrity Guarantee:** Any attempt to insert `cit-2026/01` or `  CIT-2026/01  ` is rejected immediately with a duplicate key violation.

---

## 4. Deep Dive: Reversal Integrity Constraint

To guarantee that reversal records are never created without a valid audit trail:

```sql
CONSTRAINT check_reversal_integrity CHECK (
    (is_reversal = false AND reversal_of_id IS NULL AND void_reason IS NULL) OR
    (is_reversal = true AND reversal_of_id IS NOT NULL AND length(trim(void_reason)) >= 5)
)
```

* **Standard Payments:** `is_reversal = false`. Must NOT have `reversal_of_id` or `void_reason`.
* **Reversal Entries:** `is_reversal = true`. Must supply both a valid `reversal_of_id` and a meaningful justification `void_reason` (at least 5 characters).

---

## 5. Deep Dive: Attendance Daily Uniqueness

### 5.1 Constraint Definition
```sql
CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
```

### 5.2 Atomic Batch Upsert via PostgreSQL RPC
The `public.mark_batch_attendance` function handles batch updates seamlessly:

```sql
INSERT INTO public.attendance (student_id, date, status, remarks)
VALUES (v_student_id, p_date, v_status, v_remarks)
ON CONFLICT (student_id, date)
DO UPDATE SET 
    status = EXCLUDED.status,
    remarks = EXCLUDED.remarks,
    created_at = timezone('utc', now());
```

Guarantees zero duplicate attendance rows, even if administrators edit attendance multiple times on the same date.
