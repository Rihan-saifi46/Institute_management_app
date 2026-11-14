-- ==============================================================================
-- Migration: 0002_create_fee_summary_view.sql
-- Description: Real-time financial summary view netting payments and reversals
-- Security Standard: WITH (security_invoker = true) to prevent RLS bypass
-- ==============================================================================

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

COMMENT ON VIEW public.student_fee_summary IS 'Real-time financial summary view netting payment installments against reversals with security_invoker enabled';
