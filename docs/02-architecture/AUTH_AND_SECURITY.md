# Authentication & Security Architecture

## 1. Security Baseline & Philosophy

The Computer Institute Management System enforces a **defense-in-depth** security architecture. Security boundaries are established across three distinct layers:
1. **Network & Presentation Edge:** Cloudflare DDoS mitigation, SSL/TLS 1.3 termination, and client-side route guards.
2. **Database Engine Layer (Primary Security Boundary):** PostgreSQL Row Level Security (RLS) policies enforcing authorization on every single query.
3. **Immutable Ledger Rules:** Database-level revocation of `UPDATE` and `DELETE` privileges on financial tables to guarantee tamper-proof audit trails.

---

## 2. Authentication Flow: Supabase Auth

Authentication is handled via **Supabase Auth** (built on GoTrue), issuing cryptographically signed JSON Web Tokens (JWTs).

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Institute Manager / Owner
    participant UI as React Frontend (Cloudflare Pages)
    participant Auth as Supabase Auth (GoTrue)
    participant DB as Supabase PostgreSQL + PostgREST

    Admin->>UI: Enters Email & Password
    UI->>Auth: supabase.auth.signInWithPassword({ email, password })
    Auth->>DB: Validates credentials against auth.users
    DB-->>Auth: Validation Success + User UUID
    Auth-->>UI: Returns Session with JWT Access Token
    UI->>UI: Caches session in memory / local storage
    
    Note over UI,DB: Authenticated Query Execution
    UI->>DB: supabase.from('students').select('*') (Header: Bearer <JWT>)
    DB->>DB: PostgREST extracts JWT claim: auth.uid()
    DB->>DB: Evaluates RLS Policy against public.admins (role: super_admin / manager)
    DB-->>UI: Returns authorized records only
```

---

## 3. PostgreSQL Row Level Security (RLS) Policies

All operational tables have `ROW LEVEL SECURITY` enabled. Access is denied by default to all callers unless an explicit policy grants access:

```sql
-- Enable RLS across all operational tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 1. ADMINS TABLE POLICIES
CREATE POLICY "Admins can view admin profiles" 
ON public.admins FOR SELECT TO authenticated 
USING (public.is_authorized_admin());

CREATE POLICY "Super admin can insert admin profiles" 
ON public.admins FOR INSERT TO authenticated 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update admin profiles" 
ON public.admins FOR UPDATE TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can delete other admin profiles" 
ON public.admins FOR DELETE TO authenticated 
USING (public.is_super_admin() AND user_id != auth.uid());

-- 2. STUDENTS TABLE POLICIES
CREATE POLICY "Admins can view students" 
ON public.students FOR SELECT TO authenticated 
USING (public.is_authorized_admin());

CREATE POLICY "Admins can insert students" 
ON public.students FOR INSERT TO authenticated 
WITH CHECK (public.is_authorized_admin());

CREATE POLICY "Admins can update students" 
ON public.students FOR UPDATE TO authenticated 
USING (public.is_authorized_admin())
WITH CHECK (public.is_authorized_admin());

CREATE POLICY "Super admin can delete students without history" 
ON public.students FOR DELETE TO authenticated 
USING (public.is_super_admin());

-- 3. FEE PAYMENTS TABLE: IMMUTABLE AUDIT POLICIES
CREATE POLICY "Admins can view payment ledger" 
ON public.fee_payments FOR SELECT TO authenticated 
USING (public.is_authorized_admin());

CREATE POLICY "Admins can record regular payments" 
ON public.fee_payments FOR INSERT TO authenticated 
WITH CHECK (public.is_authorized_admin() AND is_reversal = false);

-- STRICT INVARIANT: ZERO UPDATE OR DELETE POLICIES ARE CREATED FOR fee_payments
-- Direct SQL UPDATE and DELETE statements are unconditionally blocked by RLS for all users.

-- 4. ATTENDANCE TABLE POLICIES
CREATE POLICY "Admins can view attendance" 
ON public.attendance FOR SELECT TO authenticated 
USING (public.is_authorized_admin());

CREATE POLICY "Admins can insert attendance" 
ON public.attendance FOR INSERT TO authenticated 
WITH CHECK (public.is_authorized_admin());

CREATE POLICY "Admins can update attendance" 
ON public.attendance FOR UPDATE TO authenticated 
USING (public.is_authorized_admin())
WITH CHECK (public.is_authorized_admin());

CREATE POLICY "Super admin can delete attendance" 
ON public.attendance FOR DELETE TO authenticated 
USING (public.is_super_admin());
```

---

## 4. Secret Management & Key Isolation

* **Safe Client Variables (`VITE_`):**
  - `VITE_SUPABASE_URL`: The public project URL (`https://<project-ref>.supabase.co`).
  - `VITE_SUPABASE_ANON_KEY`: The public anonymous key designed specifically for client-side distribution. Safe because **RLS strictly gates all data access**.
* **Forbidden Secret (`service_role`):**
  - The Supabase `service_role` key bypasses all Row Level Security.
  - **Rule:** The `service_role` key is **strictly forbidden** from appearing in frontend code, client `.env` files, or version control.
* **Backup Secrets:**
  - Database connection strings (`SUPABASE_DB_URL`), Cloudflare R2 credentials, and GPG public encryption keys reside strictly in encrypted **GitHub Repository Secrets**.

---

## 5. Threat Modeling & Countermeasures

| Threat Vector | Attack Scenario | Implemented Mitigation |
| :--- | :--- | :--- |
| **Public Data Scraping** | Anonymous visitor queries PostgREST directly | RLS policies reject all `anon` requests; zero records returned. |
| **SQL Injection (SQLi)** | Attacker inputs SQL payloads into student search | PostgREST uses strictly parameterized queries internally; RPCs use parameterized plpgsql. |
| **Cross-Site Scripting (XSS)** | Malicious script injected into student name | React automatically escapes JSX string interpolations; input length restrictions enforced. |
| **Tampering with Past Payments** | Rogue manager attempts to alter fee history | RLS grants zero `UPDATE` or `DELETE` permissions on `fee_payments`. |
| **Unauthorized Reversal** | Manager attempts to reverse a fee entry | `public.reverse_payment` RPC strictly validates that caller has `super_admin` role. |
| **Manager Self-Escalation** | Manager attempts to update role to `super_admin` | RLS policy restricts `public.admins` updates strictly to `super_admin`. |
| **Accidental Data Purge** | Admin accidentally deletes student with paid fees | Foreign key `ON DELETE RESTRICT` aborts deletion if payment records exist. |
| **Account Brute-Forcing** | Repeated password guessing attacks | Supabase Auth built-in rate-limiting and Cloudflare DDoS edge filtering. |
