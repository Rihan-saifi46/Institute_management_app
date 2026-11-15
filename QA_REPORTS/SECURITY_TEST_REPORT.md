# Z Institute Management System — Security & Authorization Test Report

## 1. Executive Summary & Security Model

The Z Institute Management System implements a closed-system security architecture designed to prevent unauthorized administrative actions, data exfiltration, role escalation, and ledger corruption.

### Key Security Standard Applied:
1. **Defense-in-Depth:** Security is enforced primarily at the database engine level via PostgreSQL Row Level Security (RLS) and stored procedure checks, independent of frontend UI state.
2. **Strict Admin-Only System:** No public registration or self-service signup endpoints exist.
3. **Least Privilege Role Model:** Granular distinction between **Super Admin** (Institute Owner) and **Staff Manager** (Operational Staff).

---

## 2. Role-Based Access Control (RBAC) Matrix

| Operation | Super Admin (`super_admin`) | Staff Manager (`manager`) | Unprofiled Auth User | Anonymous / Public (`anon`) |
|---|:---:|:---:|:---:|:---:|
| **View Student Directory** | **ALLOW** | **ALLOW** | **DENY (0 rows)** | **DENY (0 rows)** |
| **Enroll New Student** | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| **Edit Student Profile** | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| **Delete Student (No History)** | **ALLOW** | **DENY (RLS Block)** | **DENY** | **DENY** |
| **Record Fee Payment** | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| **Direct UPDATE/DELETE on Payments** | **DENY (0 policies)** | **DENY (0 policies)** | **DENY** | **DENY** |
| **Reverse Fee Payment (RPC)** | **ALLOW** | **DENY (RPC Exception)** | **DENY** | **DENY** |
| **Mark Daily Batch Attendance** | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| **Create/Update Admin Profiles** | **ALLOW** | **DENY (RLS Block)** | **DENY** | **DENY** |
| **In-App Data Export (CSV/JSON)** | **ALLOW** | **ALLOW** | **DENY** | **DENY** |

---

## 3. Database Row Level Security (RLS) Audit

Row Level Security is enabled on all four operational tables (`admins`, `students`, `fee_payments`, `attendance`) via `0004_enable_rls_policies.sql`.

### 3.1 Immutable Ledger Policy Check (`public.fee_payments`)
- **Direct SQL Privileges Granted:**
  ```sql
  GRANT SELECT, INSERT ON public.fee_payments TO authenticated;
  ```
  `UPDATE` and `DELETE` grants were **never issued** to `authenticated` or any other client role.
- **RLS DML Policies:**
  - `Admins can view payment ledger` (FOR SELECT)
  - `Admins can record regular payments` (FOR INSERT with `WITH CHECK (is_reversal = false)`)
- **Zero UPDATE / Zero DELETE Policy Invariant:** PostgreSQL blocks all direct `UPDATE` and `DELETE` statements on `fee_payments` for all users, including super_admin. Reversals can only be executed through the trusted `reverse_payment` RPC.

### 3.2 SQL View Security: `public.student_fee_summary`
- Created with `WITH (security_invoker = true)`.
- When an anonymous or unauthorized user queries the view, PostgreSQL evaluates underlying RLS policies using the caller's credentials rather than the view creator's credentials, preventing security bypass.

---

## 4. Security Penetration & Exploit Test Results

### 4.1 Anonymous Table Probing
- **Test:** Direct query to `students`, `fee_payments`, and `attendance` with `ROLE anon`.
- **Expected:** Access denied or 0 rows returned.
- **Actual Result:** 0 rows returned; PostgreSQL RLS successfully blocked anonymous access.
- **Status:** **PASS**

### 4.2 Unprofiled Authenticated User Probing
- **Test:** Authenticated Supabase Auth user whose `auth.uid()` does not exist in `public.admins`.
- **Expected:** Denied table access.
- **Actual Result:** Helper function `is_authorized_admin()` returns `false`; RLS returns 0 rows.
- **Status:** **PASS**

### 4.3 Manager Privilege Escalation Attack
- **Test:** Authenticated user with role `manager` executes:
  `UPDATE public.admins SET role = 'super_admin' WHERE user_id = auth.uid()`
- **Expected:** Blocked by RLS.
- **Actual Result:** Policy `Super admin can update admin profiles` requires `public.is_super_admin() = true`. Blocked with 0 rows updated.
- **Status:** **PASS**

### 4.4 Manager Unauthorized Payment Reversal Attack
- **Test:** Authenticated user with role `manager` calls `reverse_payment(payment_id, reason)`.
- **Expected:** Blocked at server procedure entry.
- **Actual Result:** Stored function checks `public.admins.role`; raises exception: *"Unauthorized: Only super_admin can reverse fee payments"*.
- **Status:** **PASS**

### 4.5 SQL Injection Probing
- **Test:** Search queries entered into student directory search bar:
  - `' OR '1'='1`
  - `'; DROP TABLE students; --`
  - `admin'--`
- **Expected:** PostgREST parameterized queries treat inputs as literal text; no injection occurs.
- **Actual Result:** PostgREST sanitizes queries via parameterized ILIKE filters; returned 0 matching records safely.
- **Status:** **PASS**

### 4.6 Cross-Site Scripting (XSS) Probing
- **Test:** Student full name and payment remarks populated with:
  `<img src=x onerror=alert(document.cookie)>`
- **Expected:** Sanitized and rendered as text node.
- **Actual Result:** React virtual DOM escapes all string nodes before rendering to the DOM; zero script execution.
- **Status:** **PASS**

---

## 5. Client Bundle & Secrets Exposure Audit

The compiled production bundle (`client/dist/`) was inspected for leaked secrets:
- **`VITE_SUPABASE_URL`:** Present (Public API endpoint, expected).
- **`VITE_SUPABASE_ANON_KEY`:** Present (Public publishable key, intended for browser client, expected).
- **`SUPABASE_DB_URL` / Direct DB Password:** **ABSENT** (Zero database connection strings or passwords present in client assets).
- **`service_role` Secret Key:** **ABSENT** (Zero administrative bypass keys bundled).
- **GPG Private Keys / Backup Credentials:** **ABSENT**.
- **Audit Result:** Clean. Zero sensitive secrets exposed to client browsers.

---

## 6. Authentication Session & Route Guards
- `ProtectedRoute.tsx` checks `session` from `useAuth()`.
- Unauthenticated requests navigating directly to `/students`, `/fees`, or `/attendance` are intercepted and redirected to `/login`, storing the target route in state for seamless post-login restoration.
- Supabase Auth manages JWT lifecycles with automated background refresh before token expiry.
