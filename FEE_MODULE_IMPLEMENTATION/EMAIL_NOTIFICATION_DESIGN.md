# Email Notification Architecture & Outbox Design

**Document Version:** 1.1.0 (Synchronized with Owner Decisions of 15-Nov-2026)  
**Standard Timezone:** `Asia/Kolkata` (IST, UTC+05:30)  
**Security Directives:** Zero Frontend Secret Exposure, Zero Financial Coupling, Resend Free Plan Architecture

---

## 1. Audit of Notification Infrastructure & Decisions

### 1.1 Approved Decisions
- **Decision 1 (Optional Email):** Student email is strictly optional. Advance payments succeed whether an email exists or not. If no email is provided, `email_outbox.status` is set to `'not_required'` without blocking financial transactions. If a cashier enters an email during payment, it is used for receipt delivery; updating the student profile requires explicit confirmation.
- **Decision 3 (Resend Free Tier):** Resend (`resend.com`) is the approved transactional email provider under its official Free Plan (3,000 emails/month, 100 emails/day, 1 verified domain).
- **Client Bundle Safety Rule:** Calling Resend or SMTP directly from the React frontend is **strictly prohibited**, as it would leak private API keys to the browser. All credentials remain strictly server-side.

---

## 2. Transactional Outbox Pattern Architecture

```mermaid
flowchart TD
    subgraph Browser Client (Zero Secrets)
        UI["Administrator Records Advance in React<br/>(Optional Student Email)"]
    end

    subgraph Atomic PostgreSQL Transaction
        RPC["public.record_advance_fee (RPC)"]
        FP["public.fee_payments (Immutable Row)"]
        AFR["public.advance_fee_records (Advance Row)"]
        BOX["public.email_outbox"]

        RPC -->|Insert| FP
        RPC -->|Insert| AFR
        RPC -->|If email provided: status = 'pending'<br/>If no email: status = 'not_required'| BOX
    end

    subgraph Asynchronous Worker (Server-Side Secrets)
        WORKER["Secure Dispatcher Worker<br/>(Supabase Edge Function / Node Cron)"]
        RESEND["Resend Free Plan API<br/>(3k/month, 100/day limit)"]
        STUDENT["Student / Parent Inbox"]

        BOX -.->|Polls status = 'pending'| WORKER
        WORKER -->|Sends via RESEND_API_KEY| RESEND
        RESEND -->|Delivers| STUDENT
        WORKER -->|Success: status = 'sent', sent_at = now()| BOX
        WORKER -->|Quota/Network Error: status = 'failed', attempts++| BOX
    end

    UI -->|Calls via authenticated PostgREST| RPC
```

### Invariants:
1. **Zero Financial Rollback:** If Resend is down, rate-limited, or out of daily quota (100 emails/day), the database payment transaction **remains 100% committed**.
2. **Quota & Rate Limit Protection:** If Resend returns HTTP 429 or quota exhaustion, the worker keeps outbox records in `failed` / `pending` state and alerts the owner. It will **never** automatically trigger a paid plan upgrade.
3. **Domain Verification Requirement:** Resend requires a custom sending domain (with SPF, DKIM, DMARC DNS records) to deliver to arbitrary recipient addresses. Until a custom domain is verified, test sending is limited to the registered account email.

---

## 3. Database Schema: `public.email_outbox`

```sql
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    advance_record_id UUID REFERENCES public.advance_fee_records(id) ON DELETE CASCADE,
    recipient_email TEXT,
    subject TEXT NOT NULL,
    template_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'sent', 'failed', 'not_required')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending 
ON public.email_outbox(status, created_at) 
WHERE status = 'pending';
```

---

## 4. Advance Fee Email Template Layout

### Subject Line:
`Advance Fee Receipt — [Target Period Name] — Z Institute`

### Email Body (Responsive HTML):
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px;">
        <h2 style="margin: 0; color: #0f172a; text-transform: uppercase;">Z Institute</h2>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Computer Management & Professional Training Center</p>
        <span style="display: inline-block; margin-top: 10px; background: #f1f5f9; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; letter-spacing: 1px;">OFFICIAL ADVANCE RECEIPT</span>
    </div>

    <div style="padding: 20px 0;">
        <p>Dear <strong>{{student_name}}</strong> (Admission ID: <code>{{admission_id}}</code>),</p>
        <p>We gratefully acknowledge receipt of your advance tuition fee payment. Details are itemized below:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #475569;">Target Fee Period:</td>
                <td style="padding: 10px; font-weight: bold; color: #0f172a; text-align: right;">{{target_period}}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #475569;">Amount Received:</td>
                <td style="padding: 10px; font-weight: bold; color: #16a34a; font-size: 15px; text-align: right;">₹{{amount_paid}}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #475569;">Payment Date:</td>
                <td style="padding: 10px; text-align: right;">{{payment_date}}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #475569;">Payment Mode:</td>
                <td style="padding: 10px; text-transform: uppercase; text-align: right;">{{payment_mode}}</td>
            </tr>
            <tr style="background: #f8fafc;">
                <td style="padding: 10px; color: #475569;">Receipt Reference:</td>
                <td style="padding: 10px; font-family: monospace; text-align: right;">{{receipt_number}}</td>
            </tr>
        </table>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; font-size: 12px; color: #166534;">
            <strong>Notice of Advance Credit:</strong> This payment has been earmarked exclusively for your <strong>{{target_period}}</strong> tuition fee. It will be automatically credited to your account upon the commencement of the billing period.
        </div>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center;">
        Z Institute Management System • Automated Transaction Notification
    </div>
</div>
```

---

## 5. Resend Free Plan Implementation Checklist

1. **API Key Management:**
   - Sign up at `resend.com` on Free tier.
   - Set `RESEND_API_KEY` in Supabase Secrets or server-side `.env.local`.
   - Never prefix with `VITE_`.
2. **Domain Setup:**
   - Configure DNS records for the institute domain (DKIM, SPF, DMARC) in the domain registrar to enable delivery to any email address.
3. **Outbox Dispatch Worker:**
   - Lightweight Edge Function or scheduled worker checks `email_outbox` where `status = 'pending'`.
   - Sends email via Resend REST API `https://api.resend.com/emails`.
   - Updates status to `sent` or `failed`.
