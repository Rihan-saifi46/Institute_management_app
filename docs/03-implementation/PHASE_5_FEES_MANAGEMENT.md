# Phase 5: Module A2 – Fees Management & Printable Receipts

## 1. Objective
Implement the fee collection and accounting module, enabling administrators to record installment payments, maintain an audit-grade immutable ledger, execute authorized payment reversals with mandatory audit reasons, monitor collected versus remaining balances in real time, and generate browser-native printable fee receipts at ₹0 cost.

---

## 2. Scope
* **Fee Collection Modal:**
  - Record payment for a selected student:
    - Amount Paid (required, $> 0$).
    - Payment Date (defaults to current date).
    - Payment Mode (`cash`, `upi`, `bank_transfer`, `cheque`).
    - Optional Receipt / Transaction Reference Number.
    - Optional Remarks / Notes.
* **Audit-Grade Ledger Immutability:**
  - Original payment rows cannot be edited or deleted.
* **Authorized Reversal / Void Modal (Super Admin Only):**
  - Allows `super_admin` to reverse an erroneous payment.
  - Requires mandatory text justification reason ($\ge 5$ characters).
  - Invokes `reverse_payment` RPC, generating a linked reversal entry.
* **Fee Ledger & Balance Overview:**
  - Displays Total Course Fee, Total Paid to Date, Balance Due, and Fee Status (`PAID`, `PARTIAL`, `UNPAID`).
  - Itemized chronological table of past payment installments and any reversal entries.
* **Pending Fees Directory:**
  - Dedicated table filtering students where `balance_due > 0`.
* **Browser-Native Printable Receipt Modal:**
  - Official receipt card with Institute Header, Receipt No, Payment Date, Student Name, Admission ID, Course, Mode, Amount Paid, and Balance Remaining.
  - CSS `@media print` rules isolating the receipt card and triggering `window.print()`.

---

## 3. Out-of-Scope Items
* Integrating third-party payment gateways.
* Server-side PDF generation binaries.
* Automated SMS receipt messaging.

---

## 4. Prerequisites
* Completion and approval of Phase 4 (Student records established).
* Functional Supabase fee services from Phase 2.

---

## 5. Step-by-Step Tasks

### Task 5.1: Build Fee Collection Modal
Create `client/src/components/fees/RecordPaymentModal.tsx`:
- Selects student or receives student pre-selected.
- Displays current balance due.
- Form inputs: Amount, Date, Mode, Reference, Remarks.
- Calls `recordPayment` service.
- On success: Offers an immediate button: **"Print Receipt"**.

### Task 5.2: Build Authorized Reversal Modal
Create `client/src/components/fees/ReversePaymentModal.tsx`:
- Accessible only when logged in as `super_admin`.
- Prompts for mandatory justification reason.
- Invokes `reversePayment` service calling `public.reverse_payment` RPC.
- Displays confirmation and refreshes ledger.

### Task 5.3: Build Student Fee Ledger Component
Create `client/src/components/fees/PaymentHistoryList.tsx`:
- Renders past payments and reversal entries with distinct visual badges.
- Displays actions: "Print Receipt" (for payments) and "Reverse Payment" (for super admin on active payments).

### Task 5.4: Build Printable Fee Receipt Component
Create `client/src/components/fees/PrintableReceipt.tsx`:
- Self-contained modal displaying the official receipt layout.
- Print utility CSS isolating `#printable-receipt-card`.
- Print button invoking native `window.print()`.

### Task 5.5: Build Fees Overview & Pending Dues Page
Create `client/src/pages/FeesPage.tsx`:
- Summary metric cards: Total Expected Revenue, Total Fees Collected, Total Dues Outstanding.
- Tabbed view: "All Fee Records" vs. "Pending Dues Only".

---

## 6. Expected Files & Deliverables
* `client/src/pages/FeesPage.tsx`
* `client/src/components/fees/RecordPaymentModal.tsx`
* `client/src/components/fees/ReversePaymentModal.tsx`
* `client/src/components/fees/PaymentHistoryList.tsx`
* `client/src/components/fees/PrintableReceipt.tsx`
* `client/src/components/fees/FeeStatusBadge.tsx`
* `client/src/types/fee.ts`

---

## 7. Database Changes
* None (uses `public.fee_payments`, view `public.student_fee_summary`, and RPC `public.reverse_payment` from Phase 1).

---

## 8. Security Requirements
* Payment amount must be strictly greater than 0 (`CHECK (amount > 0)`).
* Verify that regular `admin` accounts cannot invoke the reversal function.
* Confirm that direct database `UPDATE` and `DELETE` queries on `fee_payments` fail.

---

## 9. Testing Strategy
* **Installment Calculation Test:**
  - Student with 10,000 fee: Record payment of 4,000 $\rightarrow$ Balance updates to 6,000; status changes to `PARTIAL`.
* **Reversal Workflow Test:**
  - Super admin reverses the 4,000 payment with reason "Check bounced" $\rightarrow$ Reversal entry recorded; balance updates back to 10,000; status changes to `UNPAID`.
  - Regular admin attempts to reverse payment $\rightarrow$ Blocked with "Unauthorized".
* **Print Layout Test:**
  - Click "Print Receipt" $\rightarrow$ Print preview window isolates the receipt card cleanly.

---

## 10. Acceptance Criteria
* [ ] Payments can be recorded against any student.
* [ ] Reversals can only be initiated by Super Admin and require a mandatory reason.
* [ ] Real-time balance calculations accurately net out reversals without page reload.
* [ ] Pending fees list accurately filters students with outstanding balances.
* [ ] Fee receipts render cleanly and print accurately via the browser print dialog.

---

## 11. Rollback Plan
* If fee calculations or receipt rendering introduce errors, roll back client code changes via Git.

---

## 12. Dependencies on Previous Phases
* **Depends on:** Phase 4 (Student records) and Phase 2 (Fee services & RPC).
