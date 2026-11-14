# Database Architecture

## 1. Relational Model & Schema Architecture

The database runs on **Supabase PostgreSQL (version 15/16)** configured to operational standard timezone **Asia/Kolkata (IST)**. The architecture separates operational business logic from core authentication:

1. **`auth` Schema:** Managed exclusively by Supabase Auth (GoTrue). Contains authoritative user accounts (`auth.users`), password hashes, and active sessions.
2. **`public` Schema:** Contains the institute's operational business tables, immutable financial ledgers, audit logs, views, and stored functions.

```mermaid
erDiagram
    admins {
        uuid id PK
        uuid user_id FK
        text full_name
        text role
        timestamptz created_at
    }

    students {
        uuid id PK
        text admission_id UK
        text name
        text phone
        text course
        date joining_date
        numeric total_fee
        text status
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    fee_payments {
        uuid id PK
        uuid student_id FK
        numeric amount
        date payment_date
        text payment_mode
        text receipt_number
        text remarks
        boolean is_reversal
        uuid reversal_of_id FK
        text void_reason
        uuid created_by FK
        timestamptz created_at
    }

    attendance {
        uuid id PK
        uuid student_id FK
        date date
        text status
        text remarks
        timestamptz created_at
    }

    admins }o--|| auth_users : "references auth.users(id)"
    students ||--o{ fee_payments : "has payments & reversals"
    students ||--o{ attendance : "has attendance"
    fee_payments ||--o| fee_payments : "reversal references original"
```

---

## 2. Relational Integrity & Key Constraints

### 2.1 Primary & Foreign Keys
* **Internal UUIDs:** All operational tables utilize `gen_random_uuid()` as their internal primary key (`id`). This decouples internal record identity from human-readable business identifiers.
* **Student Deletion Protection (`ON DELETE RESTRICT`):** The `fee_payments` and `attendance` tables reference `students(id)` with `ON DELETE RESTRICT`. A student record cannot be deleted from the database if financial payment or attendance history exists.
* **Self-Referential Payment Reversals:** The `fee_payments` table includes `reversal_of_id UUID REFERENCES public.fee_payments(id) ON DELETE RESTRICT`. Reversal entries explicitly link back to the erroneous original payment.
* **Single Reversal Invariant:** A partial unique index `CREATE UNIQUE INDEX unique_payment_reversal_idx ON public.fee_payments (reversal_of_id) WHERE is_reversal = true;` guarantees that an original payment cannot be reversed more than once.

### 2.2 Business Constraints
* **Case-Insensitive Admission ID Uniqueness:**
  ```sql
  CREATE UNIQUE INDEX unique_trimmed_lower_admission_id 
  ON public.students (LOWER(TRIM(admission_id)));
  ```
  Guarantees that `CIT-001`, `cit-001`, and `  CIT-001  ` are recognized as the same identifier, preventing human duplicate data entry errors while preserving visual formatting in the column.
* **Non-Negative Financials:**
  ```sql
  CONSTRAINT check_total_fee_positive CHECK (total_fee >= 0)
  CONSTRAINT check_payment_amount_positive CHECK (amount > 0)
  ```
* **Daily Attendance Uniqueness:**
  ```sql
  CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
  ```
  Guarantees that no student can have multiple attendance records on the same calendar day.

---

## 3. Real-Time Balance Calculation View (Accounting for Reversals)

To eliminate denormalization anomalies and ensure calculations are always consistent, financial balances are computed dynamically via an optimized PostgreSQL view with `WITH (security_invoker = true)` to prevent RLS bypass:

```sql
CREATE OR REPLACE VIEW public.student_fee_summary 
WITH (security_invoker = true) AS
SELECT 
    s.id,
    s.admission_id,
    s.name,
    s.phone,
    s.course,
    s.joining_date,
    s.status,
    s.total_fee,
    COALESCE(
        SUM(
            CASE 
                WHEN p.is_reversal THEN -p.amount 
                ELSE p.amount 
            END
        ), 0.00
    ) AS total_paid,
    (
        s.total_fee - COALESCE(
            SUM(
                CASE 
                    WHEN p.is_reversal THEN -p.amount 
                    ELSE p.amount 
                END
            ), 0.00
        )
    ) AS balance_due,
    CASE 
        WHEN COALESCE(SUM(CASE WHEN p.is_reversal THEN -p.amount ELSE p.amount END), 0.00) >= s.total_fee THEN 'PAID'
        WHEN COALESCE(SUM(CASE WHEN p.is_reversal THEN -p.amount ELSE p.amount END), 0.00) > 0 THEN 'PARTIAL'
        ELSE 'UNPAID'
    END AS fee_status
FROM public.students s
LEFT JOIN public.fee_payments p ON s.id = p.student_id
GROUP BY s.id;
```

---

## 4. Stored Database Functions (RPC)

For atomic, multi-statement workflows requiring elevated validation:

### 4.1 Batch Attendance Marking Function
```sql
CREATE OR REPLACE FUNCTION public.mark_batch_attendance(
    p_date DATE,
    p_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_rec JSONB;
    v_student_id UUID;
    v_status TEXT;
    v_remarks TEXT;
    v_count INT := 0;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: auth.uid() is null';
    END IF;

    SELECT role INTO v_caller_role 
    FROM public.admins 
    WHERE user_id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'manager') THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not an authorized administrator';
    END IF;

    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Invalid date: Attendance date must not be null';
    END IF;

    IF p_records IS NULL OR jsonb_typeof(p_records) != 'array' OR jsonb_array_length(p_records) = 0 THEN
        RAISE EXCEPTION 'Invalid records payload: Must be a non-empty JSON array';
    END IF;

    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        BEGIN
            v_student_id := (v_rec->>'student_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Malformed student_id: %', (v_rec->>'student_id');
        END;

        IF v_student_id IS NULL THEN
            RAISE EXCEPTION 'student_id is required in all batch records';
        END IF;

        v_status := v_rec->>'status';
        IF v_status IS NULL OR v_status NOT IN ('present', 'absent') THEN
            RAISE EXCEPTION 'Invalid attendance status "%" for student %. Must be "present" or "absent".', v_status, v_student_id;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = v_student_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Student % is not an active enrolled student or does not exist.', v_student_id;
        END IF;

        v_remarks := NULLIF(trim(v_rec->>'remarks'), '');

        INSERT INTO public.attendance (student_id, date, status, remarks, created_at)
        VALUES (v_student_id, p_date, v_status, v_remarks, (now() AT TIME ZONE 'Asia/Kolkata'))
        ON CONFLICT (student_id, date)
        DO UPDATE SET
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            created_at = (now() AT TIME ZONE 'Asia/Kolkata');
        
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'recorded_count', v_count
    );
END;
$$;
```

### 4.2 Authorized Payment Reversal Function
```sql
CREATE OR REPLACE FUNCTION public.reverse_payment(
    p_payment_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_orig public.fee_payments%ROWTYPE;
    v_reversal_id UUID;
    v_clean_reason TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: auth.uid() is null';
    END IF;

    SELECT role INTO v_caller_role 
    FROM public.admins 
    WHERE user_id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only super_admin can reverse fee payments';
    END IF;

    v_clean_reason := trim(p_reason);
    IF v_clean_reason IS NULL OR length(v_clean_reason) < 5 THEN
        RAISE EXCEPTION 'A meaningful justification reason (at least 5 characters) is mandatory for reversals';
    END IF;

    SELECT * INTO v_orig 
    FROM public.fee_payments 
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record % not found', p_payment_id;
    END IF;

    IF v_orig.is_reversal THEN
        RAISE EXCEPTION 'Invalid operation: Cannot reverse an existing reversal entry';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.fee_payments 
        WHERE reversal_of_id = p_payment_id AND is_reversal = true
    ) THEN
        RAISE EXCEPTION 'Invalid operation: Payment % has already been reversed', p_payment_id;
    END IF;

    INSERT INTO public.fee_payments (
        student_id,
        amount,
        payment_date,
        payment_mode,
        receipt_number,
        remarks,
        is_reversal,
        reversal_of_id,
        void_reason,
        created_by,
        created_at
    ) VALUES (
        v_orig.student_id,
        v_orig.amount,
        (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
        v_orig.payment_mode,
        'REV-' || COALESCE(v_orig.receipt_number, substring(v_orig.id::TEXT, 1, 8)),
        'Authorized reversal: ' || v_clean_reason,
        true,
        v_orig.id,
        v_clean_reason,
        v_caller_id,
        (now() AT TIME ZONE 'Asia/Kolkata')
    ) RETURNING id INTO v_reversal_id;

    RETURN v_reversal_id;
END;
$$;
```

---

## 5. Indexing Strategy

| Table | Index Name | Indexed Columns | Justification |
| :--- | :--- | :--- | :--- |
| `students` | `unique_trimmed_lower_admission_id` | `LOWER(TRIM(admission_id))` | Case-insensitive unique check & fast lookup. |
| `students` | `idx_students_name` | `name` | Substring and prefix searches. |
| `students` | `idx_students_phone` | `phone` | Instant phone lookups. |
| `students` | `idx_students_course` | `course` | Course-wise filtering. |
| `students` | `idx_students_status` | `status` | Active vs. dropped filtering. |
| `fee_payments` | `idx_payments_student_id` | `student_id` | Fast join on student payments ledger. |
| `fee_payments` | `idx_payments_date` | `payment_date` | Date-range financial reporting. |
| `fee_payments` | `idx_payments_reversal` | `reversal_of_id` | Fast check for existing reversals. |
| `fee_payments` | `unique_payment_reversal_idx` | `reversal_of_id (partial)` | Prevents duplicate reversals of same payment. |
| `attendance` | `idx_attendance_date` | `date` | Date-wise class attendance retrieval. |
| `attendance` | `idx_attendance_student_date` | `student_id, date` | Unique check & individual history lookup. |
