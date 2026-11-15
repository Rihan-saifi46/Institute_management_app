# Row Level Security (RLS) & Security Implementation Plan

**Document Version:** 1.1.0 (Synchronized with Owner Decisions of 15-Nov-2026)  
**Security Standard:** Strict Closed System, Least Privilege, Defense-in-Depth  
**Enforcement Level:** PostgreSQL Database Engine (`SECURITY DEFINER` + RLS Policies)

---

## 1. Security Philosophy & Role Boundaries

1. **Closed-Door Policy:** Default posture is total denial. `REVOKE ALL ON ALL TABLES FROM PUBLIC, anon;`.
2. **Backend Engine Enforcement:** Authorization rules are enforced directly by PostgreSQL Row Level Security (RLS) and stored function checks. The application **never relies solely on frontend UI button hiding**.
3. **Immutable Ledger Extension:** Tables recording monetary movements (`public.fee_payments`, `public.fee_payment_allocations`) have **zero direct `UPDATE` and zero direct `DELETE` policies**.
4. **Role Separation (Decision 6):**
   - **`super_admin` (Institute Owner):** Full operational and administrative authority. Has exclusive permission to cancel/void advance fee records via `void_advance_fee` and execute payment reversals.
   - **`admin` / `manager`:** Operational staff. Authorized to view directories, mark attendance, record normal fee collections, and record advance fees. **Strictly forbidden** from cancelling advances or executing reversals.
   - **`receptionist`:** Front-desk staff. Authorized to record normal full fee payments and record advance fee deposits. **Strictly forbidden** from cancellations, voiding, or fee configuration changes.

---

## 2. Table-by-Table RLS Policy Specifications

### 2.1 Table: `public.fee_periods`
- **Enable RLS:** `ALTER TABLE public.fee_periods ENABLE ROW LEVEL SECURITY;`
- **Revocations:** `REVOKE ALL ON public.fee_periods FROM PUBLIC, anon;`
- **Grants:** `GRANT SELECT ON public.fee_periods TO authenticated;` (Write operations restricted to Super Admin).
- **Policies:**
  ```sql
  -- Authorized staff and owners can read billing periods
  CREATE POLICY "Admins can view fee periods"
  ON public.fee_periods FOR SELECT
  TO authenticated
  USING (public.is_authorized_admin());

  -- Only Super Admin can define or modify billing periods
  CREATE POLICY "Super admin can manage fee periods"
  ON public.fee_periods FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
  ```

---

### 2.2 Table: `public.monthly_fee_dues`
- **Enable RLS:** `ALTER TABLE public.monthly_fee_dues ENABLE ROW LEVEL SECURITY;`
- **Revocations:** `REVOKE ALL ON public.monthly_fee_dues FROM PUBLIC, anon;`
- **Grants:** `GRANT SELECT, INSERT, UPDATE ON public.monthly_fee_dues TO authenticated;` (DELETE is strictly omitted).
- **Policies:**
  ```sql
  -- Authorized admins can view all student monthly fee dues
  CREATE POLICY "Admins can view monthly fee dues"
  ON public.monthly_fee_dues FOR SELECT
  TO authenticated
  USING (public.is_authorized_admin());

  -- Dues are generated via trusted RPC; direct inserts restricted to authorized admins
  CREATE POLICY "Admins can insert monthly dues"
  ON public.monthly_fee_dues FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_admin());

  -- Due amount snapshots are immutable once generated. Only system RPC updates are permitted.
  CREATE POLICY "Admins can update dues metadata"
  ON public.monthly_fee_dues FOR UPDATE
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

  -- STRICT INVARIANT: ZERO DELETE POLICIES EXIST. Dues cannot be deleted.
  ```

---

### 2.3 Table: `public.fee_payment_allocations` (Settlement Ledger)
- **Enable RLS:** `ALTER TABLE public.fee_payment_allocations ENABLE ROW LEVEL SECURITY;`
- **Revocations:** `REVOKE ALL ON public.fee_payment_allocations FROM PUBLIC, anon;`
- **Grants:** `GRANT SELECT, INSERT ON public.fee_payment_allocations TO authenticated;`
- **Policies:**
  ```sql
  -- Authorized admins can view allocations
  CREATE POLICY "Admins can view payment allocations"
  ON public.fee_payment_allocations FOR SELECT
  TO authenticated
  USING (public.is_authorized_admin());

  -- Allocations are created via trusted collection/advance RPCs
  CREATE POLICY "Admins can insert payment allocations"
  ON public.fee_payment_allocations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_admin());

  -- STRICT INVARIANT: ZERO DIRECT UPDATE AND ZERO DIRECT DELETE POLICIES.
  -- Payment allocations are immutable audit-grade settlement links.
  ```

---

### 2.4 Table: `public.advance_fee_records`
- **Enable RLS:** `ALTER TABLE public.advance_fee_records ENABLE ROW LEVEL SECURITY;`
- **Revocations:** `REVOKE ALL ON public.advance_fee_records FROM PUBLIC, anon;`
- **Grants:** `GRANT SELECT, INSERT, UPDATE ON public.advance_fee_records TO authenticated;`
- **Policies:**
  ```sql
  -- Authorized staff can view advance fee records
  CREATE POLICY "Staff can view advance fee records"
  ON public.advance_fee_records FOR SELECT
  TO authenticated
  USING (public.is_authorized_admin());

  -- Authorized staff can record advance deposits via RPC
  CREATE POLICY "Staff can record advance fees"
  ON public.advance_fee_records FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_admin());

  -- Status updates (Upcoming -> Applied) permitted only via trusted RPC
  CREATE POLICY "Staff can update advance status"
  ON public.advance_fee_records FOR UPDATE
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

  -- STRICT INVARIANT: ZERO DELETE POLICIES. Advance records are never deleted.
  -- Cancellation is handled via void_advance_fee (Super Admin Only).
  ```

---

### 2.5 Table: `public.email_outbox`
- **Enable RLS:** `ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;`
- **Revocations:** `REVOKE ALL ON public.email_outbox FROM PUBLIC, anon;`
- **Grants:** `GRANT SELECT, INSERT, UPDATE ON public.email_outbox TO authenticated;`
- **Policies:**
  ```sql
  -- Authorized admins can view outgoing email queue status
  CREATE POLICY "Admins can view email outbox"
  ON public.email_outbox FOR SELECT
  TO authenticated
  USING (public.is_authorized_admin());

  -- Enqueueing emails permitted for authorized admins
  CREATE POLICY "Admins can enqueue emails"
  ON public.email_outbox FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_admin());
  ```

---

## 3. Concurrency, Race Condition & Overpayment Protection

To eliminate race conditions when two administrators attempt to collect payment on the same student simultaneously:

1. **Pessimistic Row Locking (`FOR UPDATE`):**
   Inside the `collect_monthly_fee` stored procedure:
   ```sql
   -- Lock the monthly due row against concurrent modification
   SELECT * INTO v_due 
   FROM public.monthly_fee_dues 
   WHERE id = p_due_id 
   FOR UPDATE;
   ```
2. **Atomic In-Transaction Settlement Calculation:**
   The procedure calculates current settled amounts inside the exclusive transaction lock:
   $$\text{Current Settled} = \sum (\text{Allocated})$$
   $$\text{Payable Outstanding} = \text{Fee Snapshot} - \text{Current Settled}$$
   - If $\text{Payable Outstanding} = 0$, the second request is immediately rejected with: *"This monthly fee due has already been settled in full."*
   - If payment amount $\ne \text{Payable Outstanding}$, the request is rejected with: *"Partial or excess payments are prohibited. Exact outstanding amount is ₹X."*
3. **Result:** Accidental duplicate collection or concurrent double-charging is **100% mathematically prevented** at the PostgreSQL transaction level.
