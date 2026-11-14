# User Roles and Permissions

## 1. Overview & Security Philosophy

The Computer Institute Management System enforces a **strict closed-access model**. Unlike consumer web applications, there is no public self-registration. Access to all routes, data tables, and operational workflows is gated behind verified administrative credentials.

All identity management is powered by **Supabase Auth**, while authorization is enforced through a combination of:
1. Client-Side Protected Route Guards (React).
2. Database Row Level Security (PostgreSQL RLS).
3. PostgreSQL Function-level access controls (`SECURITY DEFINER` with explicit caller role checks).

---

## 2. Defined Roles for MVP

In the MVP release, two administrative roles are defined:

```
[System User]
      │
      ├── Super Admin (Institute Owner)
      │      └── Unrestricted access to all modules, financial data, admin user provisioning,
      │          authorized payment reversals, and full disaster recovery procedures.
      │
      └── Admin (Institute Manager)
             └── Daily operational access to student management, fee collection, receipt printing,
                 and attendance marking. Cannot reverse payments or manage admin accounts.
```

### 2.1 Role Definitions

| Role | Target Persona | Description |
| :--- | :--- | :--- |
| **`super_admin`** | Institute Owner | Holds primary system ownership. Can invite/deactivate managers, perform database exports, execute authorized fee payment reversals, and perform recovery testing. |
| **`admin`** | Institute Manager / Front Desk Staff | Manages daily institute operations: student onboarding, installment payment entry, attendance marking, and receipt printing. Cannot reverse payments or manage other admin accounts. |

---

## 3. Permissions Matrix (MVP Scope)

| Capability / Action | Super Admin (`super_admin`) | Admin (`admin`) | Unauthenticated Visitor |
| :--- | :---: | :---: | :---: |
| **Login to Dashboard** | Allowed | Allowed | Denied (Redirect to `/login`) |
| **View Dashboard Summary Cards** | Allowed | Allowed | Denied |
| **View Student Directory** | Allowed | Allowed | Denied |
| **Create New Student** | Allowed | Allowed | Denied |
| **Edit Student Record** | Allowed | Allowed | Denied |
| **Archive Student (`dropped` / `completed`)** | Allowed | Allowed | Denied |
| **Permanently Delete Student** | Restricted (Allowed only if zero payments exist) | Denied | Denied |
| **Record Fee Payment** | Allowed | Allowed | Denied |
| **View Student Payment History** | Allowed | Allowed | Denied |
| **Print / Generate Fee Receipt** | Allowed | Allowed | Denied |
| **Record Fee Reversal / Void Entry** | **Allowed** (Requires mandatory reason) | **Denied** (Audit locked) | Denied |
| **Edit or Delete Past Payment Record** | **STRICTLY FORBIDDEN** (Database-level deny) | **STRICTLY FORBIDDEN** | Denied |
| **View Pending Fees Report** | Allowed | Allowed | Denied |
| **Mark Batch Attendance** | Allowed | Allowed | Denied |
| **Edit Past Attendance** | Allowed | Allowed | Denied |
| **View Student Attendance History** | Allowed | Allowed | Denied |
| **1-Click Full Data Export (JSON/CSV)** | Allowed | Allowed | Denied |
| **Invite New Admin / Manage Users** | Allowed | Denied | Denied |
| **Direct Database Connection (`pg_dump`)** | Allowed | Denied | Denied |

---

## 4. Enforcement Architecture

### 4.1 Client-Side (React Application)
* The client application stores the active Supabase Auth session token securely in local storage.
* A higher-order component (`<ProtectedRoute>`) intercepts route transitions.
* If no active session exists, the browser immediately redirects to `/login`.
* UI controls for privileged actions (e.g. "Reverse Payment", "Manage Admins") are conditionally rendered only for `super_admin` accounts.

### 4.2 Database Layer (PostgreSQL Row Level Security)
* Even if client-side code is bypassed or manipulated, PostgreSQL RLS policies evaluate `auth.uid()` against the `public.admins` table before returning or modifying any table rows.
* Table access defaults to `DENY ALL` unless explicitly granted to authenticated administrative roles.
* For `public.fee_payments`, PostgreSQL policies explicitly permit only `SELECT` and `INSERT`. `UPDATE` and `DELETE` operations are completely disabled for all roles at the database level to ensure an immutable financial audit trail.

---

## 5. User Provisioning & Onboarding

1. **Bootstrap Super Admin:** The initial `super_admin` account (Institute Owner) is created during Phase 1 deployment using the Supabase Dashboard Auth interface or an initial SQL seeding migration.
2. **Additional Managers:** The `super_admin` can register additional `admin` users via the Supabase Admin console or an authorized database function.
3. **No Public Registration:** The Supabase project is configured with self-registration disabled ("Enable email signups" unchecked in Supabase Auth settings).

---

## 6. Future Expansion (Post-MVP)

* **`student` Role:** Read-only access to view individual attendance logs, downloaded receipts, and outstanding fee balance.
* **`teacher` Role:** Access restricted strictly to marking and reviewing attendance for assigned courses or batches, with zero visibility into student fee data.
