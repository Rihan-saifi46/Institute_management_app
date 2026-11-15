# Frontend Implementation Plan: Monthly Billing & Advance Fee Module

**Document Version:** 1.1.0 (Synchronized with Owner Decisions of 15-Nov-2026)  
**Standard Timezone:** `Asia/Kolkata` (IST, UTC+05:30)  
**Governing Architecture:** Month-Wise Collection, Strict Full-Payment Normal Dues, Dedicated Advance Earmarking

---

## 1. Overview & Architectural Principles

The frontend redesign transitions the Z Institute Management System from a coarse course-level fee dashboard into a granular, month-aware financial operations hub.

### Core Principles
1. **Explicit Period Scoping**: Every fee view and transaction is explicitly tied to a `fee_period` (`YYYY-MM`). Billing commences from **November 2026** (Decision 5).
2. **Reusing Existing Student Fee Field**: Each student's monthly fee is read from `students.total_fee` (the value entered during student creation per Decision 2). The UI label in student modals will be updated to *"Monthly Tuition Fee (₹)"*.
3. **Strict Full-Payment Enforcement in Normal Collection**: The normal fees payment UI disables freeform amount entry. The amount input is read-only, displaying the exact remaining payable balance (`outstanding_balance = fee_snapshot - advance_applied - amount_paid`).
4. **Dedicated Advance Fee Workflow**: Advance payments are physically separated into a dedicated top-level page (`/advance-fees`).
5. **Optional Student Email Handling**: Email input is optional during advance recording (Decision 1). Missing email never blocks advance collection.
6. **Admin-Only Advance Cancellation**: Super Admin users can void advance fees via a dedicated modal; managers and receptionists have this control hidden and blocked (Decision 6).

---

## 2. Page & Component Hierarchy

```mermaid
graph TD
    App[App.tsx Router] --> Sidebar[Sidebar.tsx Navigation]
    App --> FeesPage[FeesPage.tsx (/fees)]
    App --> AdvanceFeesPage[AdvanceFeesPage.tsx (/advance-fees)]

    FeesPage --> FeePeriodSelector[FeePeriodSelector.tsx]
    FeesPage --> FeeMetricsCards[FeeMetricsCards.tsx]
    FeesPage --> MonthlyDuesTable[MonthlyDuesTable.tsx]
    MonthlyDuesTable --> RecordMonthlyPaymentModal[RecordMonthlyPaymentModal.tsx]
    MonthlyDuesTable --> MonthlyHistoryModal[MonthlyHistoryModal.tsx]
    RecordMonthlyPaymentModal --> PrintableMonthlyReceipt[PrintableMonthlyReceipt.tsx]

    AdvanceFeesPage --> AdvanceMetricsCards[AdvanceMetricsCards.tsx]
    AdvanceFeesPage --> RecordAdvanceModal[RecordAdvanceModal.tsx]
    AdvanceFeesPage --> UpcomingAdvanceTable[UpcomingAdvanceTable.tsx]
    AdvanceFeesPage --> AppliedAdvanceTable[AppliedAdvanceTable.tsx]
    UpcomingAdvanceTable --> VoidAdvanceModal[VoidAdvanceModal.tsx (Super Admin Only)]
    RecordAdvanceModal --> PrintableAdvanceReceipt[PrintableAdvanceReceipt.tsx]
```

---

## 3. Detailed Component Specifications

### 3.1. Navigation & Routing Updates

#### `client/src/App.tsx`
- Add route `/advance-fees` protected by `RoleRoute` (`super_admin`, `admin`, `receptionist`):
```tsx
const AdvanceFeesPage = lazy(() => import('./pages/AdvanceFeesPage'));
// Inside Routes:
<Route
  path="/advance-fees"
  element={
    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'receptionist']}>
      <AdvanceFeesPage />
    </ProtectedRoute>
  }
/>
```

#### `client/src/components/layout/Sidebar.tsx`
- Add "Advance Fees" navigation link with an icon (`CalendarClock` from `lucide-react`) directly beneath "Fees Management".

---

### 3.2. Existing Fees Page (`client/src/pages/FeesPage.tsx`) Redesign

#### 1. Header & Period Filter Toolbar
- **Month Picker Dropdown**: Defaults to Current Month (`Asia/Kolkata`, e.g., "November 2026").
  - Dropdown options start from **November 2026** onwards (Decision 5).
- **Search & Filter Inputs**:
  - Student Name / Roll Number / Phone search.
  - Status Filter: `All`, `Unpaid`, `Partially Paid`, `Paid`.
  - Batch Filter: Filter by assigned course batch.
- **Action Buttons**:
  - `Generate Monthly Dues` (Triggers on-demand generation RPC for current active period).
  - `Export Month Dues CSV`.

#### 2. Metric KPI Cards (Calculated for Selected Month)
- **Current Month Total Due**: $\sum \text{fee\_snapshot}$ for selected month.
- **Advance Amount Adjusted**: Total credit applied from previous advance deposits.
- **Direct Collections**: Cash/UPI/Bank collected for this month's dues.
- **Arrears Outstanding**: Unpaid balance for this specific month.
- **Unpaid Student Count**: Count of active students with status `UNPAID` or `PARTIALLY_PAID`.

#### 3. Monthly Dues Data Table (`MonthlyDuesTable.tsx`)
Columns:
1. **Student Info**: Name, Roll Number, Phone, Course/Batch.
2. **Fee Month**: Month label (e.g., `Nov 2026`).
3. **Monthly Fee Snapshot**: ₹ Amount locked for that month.
4. **Advance Applied**: ₹ Offset from advance pool (badge indicating discount/pre-payment).
5. **Paid Amount**: ₹ Directly paid.
6. **Remaining Outstanding**: ₹ Due ($Snapshot - Advance - Paid$).
7. **Status Badge**:
   - `PAID` (Green - ₹0 remaining).
   - `PARTIALLY PAID` (Amber - partially covered by advance/adjustment).
   - `UNPAID` (Red - no payments applied).
8. **Actions**:
   - `Collect Fee` (Button): Disabled if Status is `PAID` or remaining balance is ₹0.
   - `View History` (Button): Opens student's month-by-month fee audit trail.

---

### 3.3. Monthly Payment Collection Modal (`RecordMonthlyPaymentModal.tsx`)

This modal enforces the **Owner-Approved Rule: Exact Full Payment Only**.

#### UI Controls & Invariants:
1. **Student & Month Summary Header**:
   - Displays Student Name, Roll No, and Selected Billing Month (e.g. `December 2026`).
   - Displays Fee Snapshot: `₹2,500.00`.
   - Displays Advance Already Applied: `₹500.00`.
   - Displays Prior Paid Amount: `₹0.00`.
   - **Net Remaining Payable**: `₹2,000.00` (highlighted in bold green).
2. **Payment Amount Input**:
   - **LOCKED / DISABLED** input field fixed to exact Net Remaining Payable.
   - Helper text: *"Partial payments and overpayments are not permitted in normal fee collection. The exact outstanding balance must be collected in full."*
3. **Payment Method Selector**:
   - Radios / Dropdown: `Cash`, `UPI`, `Bank Transfer`, `Cheque`.
4. **Transaction Reference / Remarks**:
   - Optional UPI Transaction ID / Cheque No.
   - Optional Notes.
5. **Submit Action**:
   - Dispatches RPC `collect_monthly_fee`.
   - On success: Automatically opens `PrintableMonthlyReceipt` and refreshes table state.

---

### 3.4. Printable Monthly Receipt (`PrintableMonthlyReceipt.tsx`)

- **Institute Header**: Z Institute Management System.
- **Receipt Metadata**: Auto-increment sequence, IST Date & Time, Received By.
- **Student Details**: Full Name, Roll No, Course, Phone.
- **Invoice Line Items**:
  | Description | Amount |
  | :--- | :--- |
  | Monthly Tuition Fee — **December 2026** | ₹2,500.00 |
  | Less: Pre-allocated Advance Fee Credit | -₹500.00 |
  | **Net Payable for Month** | **₹2,000.00** |
  | **Amount Paid (This Transaction)** | **₹2,000.00** |
  | **Remaining Balance for December 2026** | **₹0.00** |
- **Payment Method & Reference**: `UPI (Ref: UPI/2026/89123891)`

---

### 3.5. New Advance Fees Page (`client/src/pages/AdvanceFeesPage.tsx`)

#### Tabs:
1. **Upcoming Advances** (Default):
   - Lists all advance payments for future fee periods that have not yet been fully applied.
   - Columns: Student Name, Roll No, Target Month (e.g., `Jan 2027`), Monthly Fee Ceiling, Advance Deposited, Status (`Upcoming`), Date Deposited, Receipt No, Actions.
   - Actions:
     - `Print Receipt` (All staff)
     - `Void Advance` (Button visible **only to Super Admin**, Decision 6).
2. **Applied Advance History**:
   - Lists historical advances that have transitioned to `Applied` or `Partially Applied`.
   - Shows the linked payment reference and the generated monthly due ID.

---

### 3.6. Advance Fee Entry Modal (`RecordAdvanceModal.tsx`)

Implements strict validation rules for advance recording:

#### Fields & Validation Rules:
1. **Student Selector**:
   - Searchable combobox for active students.
   - Displays student's individual monthly fee (`students.total_fee`).
2. **Target Billing Period (Month & Year)**:
   - Month-Year picker limited to **future months** (strictly $> \text{current\_month}$).
3. **Ceiling Verification Display (Decision 2)**:
   - Computes:
     $$\text{Remaining Allowed Advance} = \text{student.total\_fee} - \sum \text{existing\_active\_advances\_for\_target\_month}$$
   - Displays real-time limit indicator.
4. **Advance Amount Input**:
   - Number input: $0 < \text{amount} \le \text{Remaining Allowed Advance}$.
5. **Student Email Input (Decision 1: Optional)**:
   - Pre-filled from `students.email` if registered.
   - If empty, displays input with label: *"Student/Parent Email (Optional for receipt dispatch)"*.
   - Checkbox: *"Save this email to student's profile"* (default unchecked; prompt-only, never silent overwrite).
   - If left blank: Submission proceeds smoothly without error; physical receipt is printable immediately.
6. **Payment Method & References**:
   - Method (`Cash`, `UPI`, `Bank Transfer`, etc.).
7. **Submit & Outbox**:
   - Calls `record_advance_fee`.

---

### 3.7. Admin Advance Cancellation Modal (`VoidAdvanceModal.tsx` - Decision 6)

- **Access Guard**: Strictly restricted to `super_admin`.
- **Form Controls**:
  - Displays original advance details: Student Name, Target Month, Amount, Original Receipt No.
  - Required Textarea: *"Reason for Cancellation / Refund (minimum 5 characters)"*.
  - Warning notice: *"This will permanently void the advance record and record an auditable reversal entry in the immutable financial ledger. This action cannot be undone."*
- **Action**:
  - Calls `void_advance_fee(advanceId, reason)`.
  - Refreshes advance table and shows reversal confirmation receipt.

---

## 4. State Management & API Services

### 4.1. Updated Service: `client/src/services/fees.ts`
```typescript
export interface FeePeriod {
  id: string;
  period_key: string; // '2026-11'
  period_name: string; // 'November 2026'
  start_date: string;
  end_date: string;
  due_date: string;
  is_active: boolean;
}

export interface MonthlyDueRecord {
  due_id: string;
  student_id: string;
  student_name: string;
  admission_id: string;
  period_key: string;
  period_name: string;
  fee_snapshot: number;
  advance_applied_amount: number;
  normal_paid_amount: number;
  balance_remaining: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  is_arrears: boolean;
}

export const feeService = {
  // Periods
  getActiveFeePeriods: async (): Promise<FeePeriod[]> => { ... },

  // Monthly Dues
  getMonthlyDuesByPeriod: async (periodKey: string): Promise<MonthlyDueRecord[]> => { ... },
  triggerGenerateMonthlyDues: async (periodKey: string): Promise<{ dues_created: number; advances_applied: number }> => { ... },

  // Collection (Exact Full Payment)
  collectMonthlyFee: async (payload: {
    dueId: string;
    amount: number;
    paymentMethod: string;
    transactionReference?: string;
    notes?: string;
  }) => { ... },

  // Advance Payments
  getUpcomingAdvances: async (): Promise<any[]> => { ... },
  getAppliedAdvances: async (): Promise<any[]> => { ... },
  recordAdvanceFee: async (payload: {
    studentId: string;
    targetPeriodKey: string;
    amount: number;
    paymentMethod: string;
    receiptNumber?: string;
    remarks?: string;
    studentEmail?: string;
  }) => { ... },

  // Privileged Advance Cancellation (Super Admin Only)
  voidAdvanceFee: async (advanceId: string, voidReason: string) => { ... },
};
```
