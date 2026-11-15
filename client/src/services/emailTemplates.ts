// ==============================================================================
// Z Institute Management System - Email Notification Templates
// Aligned with FEE_MODULE_IMPLEMENTATION/EMAIL_NOTIFICATION_DESIGN.md
// Responsive HTML + Plain Text Email Templates for Transactional Notifications
// ==============================================================================

export interface AdvanceReceiptEmailData {
  student_name: string;
  admission_id: string;
  target_period: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string;
  receipt_number: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Basic HTML entity escaper to guard against injection inside email clients.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format currency amount with Indian standard grouping and two decimal places.
 */
export function formatIndianRupees(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0.00';
  }
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generate responsive HTML email for Advance Tuition Fee Receipt.
 */
export function renderAdvanceReceiptHtml(data: AdvanceReceiptEmailData): string {
  const safeStudentName = escapeHtml(data.student_name);
  const safeAdmissionId = escapeHtml(data.admission_id);
  const safeTargetPeriod = escapeHtml(data.target_period);
  const formattedAmount = formatIndianRupees(data.amount_paid);
  const safePaymentDate = escapeHtml(data.payment_date);
  const safePaymentMode = escapeHtml(data.payment_mode).toUpperCase();
  const safeReceiptNumber = escapeHtml(data.receipt_number);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Advance Fee Payment Receipt</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px;">
      <h2 style="margin: 0; color: #0f172a; text-transform: uppercase; font-size: 22px; letter-spacing: 1.5px; font-weight: 800;">Z Institute</h2>
      <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">Computer Management &amp; Professional Training Center</p>
      <div style="margin-top: 14px;">
        <span style="display: inline-block; background: #f1f5f9; color: #0f172a; padding: 4px 14px; border-radius: 4px; font-weight: 700; font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; border: 1px solid #e2e8f0;">OFFICIAL ADVANCE RECEIPT</span>
      </div>
    </div>

    <!-- Body -->
    <div style="padding: 24px 0 16px;">
      <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6;">Dear <strong>${safeStudentName}</strong> (Admission ID: <code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${safeAdmissionId}</code>),</p>
      <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">We gratefully acknowledge receipt of your advance tuition fee payment. The details of your transaction are itemized below:</p>

      <!-- Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
        <tbody>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; color: #475569;">Target Fee Period:</td>
            <td style="padding: 12px; font-weight: 700; color: #0f172a; text-align: right;">${safeTargetPeriod}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; color: #475569;">Amount Received:</td>
            <td style="padding: 12px; font-weight: 800; color: #16a34a; font-size: 15px; text-align: right;">₹${formattedAmount}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; color: #475569;">Payment Date:</td>
            <td style="padding: 12px; text-align: right; color: #1e293b;">${safePaymentDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; color: #475569;">Payment Mode:</td>
            <td style="padding: 12px; text-transform: uppercase; text-align: right; font-weight: 600; color: #1e293b;">${safePaymentMode}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; color: #475569;">Receipt Reference:</td>
            <td style="padding: 12px; font-family: monospace; text-align: right; font-weight: 700; color: #0f172a;">${safeReceiptNumber}</td>
          </tr>
        </tbody>
      </table>

      <!-- Advance Credit Notice -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 16px; border-radius: 8px; font-size: 12px; color: #166534; line-height: 1.5; margin-top: 20px;">
        <strong>Notice of Advance Credit:</strong> This payment has been earmarked exclusively for your <strong>${safeTargetPeriod}</strong> tuition fee. It will be automatically credited to your student account upon the commencement of that billing period.
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
      Z Institute Management System • Automated Transaction Notification<br>
      For any billing queries, please contact the institute front desk.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain text email fallback for Advance Tuition Fee Receipt.
 */
export function renderAdvanceReceiptText(data: AdvanceReceiptEmailData): string {
  const formattedAmount = formatIndianRupees(data.amount_paid);
  const paymentMode = (data.payment_mode || '').toUpperCase();

  return `Z INSTITUTE
Computer Management & Professional Training Center
OFFICIAL ADVANCE RECEIPT
============================================================

Dear ${data.student_name} (Admission ID: ${data.admission_id}),

We gratefully acknowledge receipt of your advance tuition fee payment. The details of your transaction are itemized below:

Target Fee Period:  ${data.target_period}
Amount Received:    ₹${formattedAmount}
Payment Date:       ${data.payment_date}
Payment Mode:       ${paymentMode}
Receipt Reference:  ${data.receipt_number}

Notice of Advance Credit:
This payment has been earmarked exclusively for your ${data.target_period} tuition fee. It will be automatically credited to your student account upon the commencement of that billing period.

============================================================
Z Institute Management System • Automated Transaction Notification
For any billing queries, please contact the institute front desk.`;
}

/**
 * Generate complete rendered email bundle with subject, html, and text.
 */
export function generateAdvanceReceiptEmail(data: AdvanceReceiptEmailData): RenderedEmail {
  const subject = `Advance Fee Receipt — ${data.target_period} — Z Institute`;
  const html = renderAdvanceReceiptHtml(data);
  const text = renderAdvanceReceiptText(data);

  return {
    subject,
    html,
    text,
  };
}
