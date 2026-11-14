# Phase 2: Supabase Client Integration & RPC Layer

## 1. Objective
Establish the client-side database integration layer using the official Supabase JavaScript SDK (`@supabase/supabase-js`). This layer provides strongly typed database queries, encapsulates PostgREST REST calls, and provides high-level service wrappers for stored database procedures (`rpc`), completely eliminating the need for an intermediate proxy server.

---

## 2. Scope
* Install and configure `@supabase/supabase-js` in the frontend client project.
* Generate or author TypeScript database type definitions (`types/database.ts`).
* Build encapsulated data service modules:
  - `services/auth.ts`: Authentication, session retrieval, and profile mapping.
  - `services/students.ts`: Student CRUD, search queries, and status filtering.
  - `services/fees.ts`: Fee collection, history ledger, dues directory, and reversal RPC invocation.
  - `services/attendance.ts`: Date-wise queries, individual history, and batch upsert RPC invocation.
* Configure client-side error handling, network retry policies, and session token injection.

---

## 3. Out-of-Scope Items
* Building the React UI presentation views (handled in Phases 3, 4, 5, and 6).
* Third-party payment gateways.
* Intermediate serverless proxy functions (Cloudflare Workers omitted per DEC-001).

---

## 4. Prerequisites
* Completion and approval of Phase 1 (Database schema, views, functions, and Supabase project active).
* Supabase project URL and public `anon_key`.

---

## 5. Step-by-Step Tasks

### Task 2.1: Install Supabase Client
In `client/`:
```bash
npm install @supabase/supabase-js
```

### Task 2.2: Configure Supabase Client Instance
Create `client/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### Task 2.3: Generate Database Type Definitions
Create `client/src/types/database.ts` reflecting tables (`admins`, `students`, `fee_payments`, `attendance`), views (`student_fee_summary`), and functions (`mark_batch_attendance`, `reverse_payment`).

### Task 2.4: Implement Data Service Modules
Create modular, testable service functions:
* `services/students.ts`:
  - `getStudents({ query, course, status, page, pageSize })`
  - `createStudent(payload)`
  - `updateStudent(id, payload)`
* `services/fees.ts`:
  - `getFeeSummary({ query, status })`
  - `recordPayment(payload)`
  - `reversePayment({ paymentId, reason })` $\rightarrow$ calls `supabase.rpc('reverse_payment', ...)`
* `services/attendance.ts`:
  - `getAttendanceForDate(date)`
  - `getStudentAttendanceHistory(studentId)`
  - `saveBatchAttendance(date, records)` $\rightarrow$ calls `supabase.rpc('mark_batch_attendance', ...)`

---

## 6. Expected Files & Deliverables
* `client/src/lib/supabase.ts`
* `client/src/types/database.ts`
* `client/src/services/auth.ts`
* `client/src/services/students.ts`
* `client/src/services/fees.ts`
* `client/src/services/attendance.ts`
* Environment configuration: `client/.env.example`

---

## 7. Database Changes
* None in this phase (uses schema established in Phase 1).

---

## 8. Security Requirements
* Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are bundled.
* Under no circumstances is the `service_role` key permitted in client environment files.
* Verify that RLS blocks any client query if no valid session token is attached.

---

## 9. Testing Strategy
* **Integration Tests with Vitest:**
  - Test `services/students.ts` against a test Supabase instance: Verify student creation and query filtering.
  - Test `services/fees.ts`: Verify that payment insertion succeeds and `reversePayment` fails when invoked without `super_admin` session.
  - Test `services/attendance.ts`: Verify `saveBatchAttendance` executes atomically via RPC.

---

## 10. Acceptance Criteria
* [ ] Supabase client initializes cleanly with typed schemas.
* [ ] All service methods execute successfully against Supabase endpoints.
* [ ] Database functions (`mark_batch_attendance`, `reverse_payment`) are callable via `.rpc()`.
* [ ] Unauthenticated requests are rejected by PostgreSQL RLS.

---

## 11. Rollback Plan
* If service layer changes break, revert files via Git to previous commit.

---

## 12. Dependencies on Previous Phases
* **Depends on:** Phase 1 (Supabase project, schema, and functions).
