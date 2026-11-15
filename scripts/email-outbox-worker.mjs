#!/usr/bin/env node
// ==============================================================================
// Z Institute Management System - Standalone Email Outbox Dispatcher Worker
// Aligned with FEE_MODULE_IMPLEMENTATION/EMAIL_NOTIFICATION_DESIGN.md
// Resend Free Tier Transactional Dispatcher (Zero External NPM Dependencies)
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Load environment variables from .env.local or .env if present
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;
      const key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    console.warn(`[Outbox Worker] Note: Could not load env from ${filePath}: ${err.message}`);
  }
}

// Load env files in priority order
loadEnvFile(path.join(ROOT_DIR, '.env.local'));
loadEnvFile(path.join(ROOT_DIR, '.env'));
loadEnvFile(path.join(ROOT_DIR, 'client', '.env.local'));
loadEnvFile(path.join(ROOT_DIR, 'client', '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_ANON_KEY || 
                     process.env.VITE_SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Z Institute <onboarding@resend.dev>';
const RESEND_API_URL = 'https://api.resend.com/emails';
const MAX_ATTEMPTS = 5;

// Parse CLI flags
const args = process.argv.slice(2);
const isRunOnce = args.includes('--once') || !args.includes('--watch');
let pollIntervalSec = 30;
const intervalIndex = args.indexOf('--interval');
if (intervalIndex !== -1 && args[intervalIndex + 1]) {
  pollIntervalSec = parseInt(args[intervalIndex + 1], 10) || 30;
}
let batchSize = 20;
const batchIndex = args.indexOf('--batch');
if (batchIndex !== -1 && args[batchIndex + 1]) {
  batchSize = parseInt(args[batchIndex + 1], 10) || 20;
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatIndianRupees(amount) {
  const n = Number(amount);
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  return clean.length >= 5 && clean.includes('@') && clean.includes('.');
}

function renderAdvanceReceiptHtml(data) {
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
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px;">
      <h2 style="margin: 0; color: #0f172a; text-transform: uppercase; font-size: 22px; letter-spacing: 1.5px; font-weight: 800;">Z Institute</h2>
      <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">Computer Management &amp; Professional Training Center</p>
      <div style="margin-top: 14px;">
        <span style="display: inline-block; background: #f1f5f9; color: #0f172a; padding: 4px 14px; border-radius: 4px; font-weight: 700; font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; border: 1px solid #e2e8f0;">OFFICIAL ADVANCE RECEIPT</span>
      </div>
    </div>
    <div style="padding: 24px 0 16px;">
      <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6;">Dear <strong>${safeStudentName}</strong> (Admission ID: <code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${safeAdmissionId}</code>),</p>
      <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">We gratefully acknowledge receipt of your advance tuition fee payment. The details of your transaction are itemized below:</p>
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
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 16px; border-radius: 8px; font-size: 12px; color: #166534; line-height: 1.5; margin-top: 20px;">
        <strong>Notice of Advance Credit:</strong> This payment has been earmarked exclusively for your <strong>${safeTargetPeriod}</strong> tuition fee. It will be automatically credited to your student account upon the commencement of that billing period.
      </div>
    </div>
    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
      Z Institute Management System • Automated Transaction Notification<br>
      For any billing queries, please contact the institute front desk.
    </div>
  </div>
</body>
</html>`;
}

function renderAdvanceReceiptText(data) {
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

// Supabase PostgREST Client Helpers
async function getPendingOutboxRows(limit) {
  const url = `${SUPABASE_URL}/rest/v1/email_outbox?status=eq.pending&attempts=lt.${MAX_ATTEMPTS}&order=created_at.asc&limit=${limit}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch pending emails (${res.status}): ${errorText}`);
  }

  return await res.json();
}

async function updateOutboxRow(id, fields) {
  const url = `${SUPABASE_URL}/rest/v1/email_outbox?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(fields),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update outbox row ${id} (${res.status}): ${errorText}`);
  }
}

// Main Batch Dispatch Execution
async function processBatch() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Outbox Worker] Polling email_outbox for pending messages...`);

  let items;
  try {
    items = await getPendingOutboxRows(batchSize);
  } catch (err) {
    console.error(`[Outbox Worker] Database error: ${err.message}`);
    return { error: err.message };
  }

  if (!items || items.length === 0) {
    console.log(`[Outbox Worker] No pending messages in queue. (Clean)`);
    return { processed: 0, sent: 0, failed: 0, notRequired: 0 };
  }

  console.log(`[Outbox Worker] Found ${items.length} pending notification(s). Processing batch...`);

  let sentCount = 0;
  let failedCount = 0;
  let notRequiredCount = 0;

  for (const item of items) {
    // Decision 1: Missing or invalid email -> status = 'not_required'
    if (!isValidEmail(item.recipient_email)) {
      console.log(`[Outbox Worker] Row ${item.id}: Student email not provided. Setting status to 'not_required'.`);
      await updateOutboxRow(item.id, {
        status: 'not_required',
        last_error: 'Recipient email missing or invalid format',
      });
      notRequiredCount += 1;
      continue;
    }

    // Check API Key
    if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
      console.warn(`[Outbox Worker] Row ${item.id}: RESEND_API_KEY is not set. Incrementing attempt.`);
      const nextAttempts = (item.attempts || 0) + 1;
      const status = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await updateOutboxRow(item.id, {
        attempts: nextAttempts,
        status,
        last_error: 'RESEND_API_KEY is not configured on server',
      });
      failedCount += 1;
      continue;
    }

    // Render Template
    let subject = item.subject;
    let htmlContent = '';
    let textContent = '';
    const payload = item.payload || {};

    if (item.template_name === 'advance_receipt') {
      const emailData = {
        student_name: payload.student_name || 'Student',
        admission_id: payload.admission_id || '—',
        target_period: payload.target_month || payload.target_period || 'Tuition Fee',
        amount_paid: Number(payload.amount ?? payload.amount_paid ?? 0),
        payment_date: payload.date || payload.payment_date || new Date().toISOString().split('T')[0],
        payment_mode: payload.payment_mode || 'Cash',
        receipt_number: payload.receipt_number || 'ADV-RECEIPT',
      };
      subject = item.subject || `Advance Fee Receipt — ${emailData.target_period} — Z Institute`;
      htmlContent = renderAdvanceReceiptHtml(emailData);
      textContent = renderAdvanceReceiptText(emailData);
    } else {
      htmlContent = `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
      textContent = JSON.stringify(payload, null, 2);
    }

    // Dispatch via Resend REST API
    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [item.recipient_email.trim()],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        const resendId = resData?.id || 'OK';
        console.log(`[Outbox Worker] Sent email to ${item.recipient_email} (Resend ID: ${resendId})`);

        await updateOutboxRow(item.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null,
        });
        sentCount += 1;
      } else if (res.status === 429) {
        // Decision 3: Quota limit / Rate limit hit
        const errorBody = await res.json().catch(() => ({}));
        const errorMsg = errorBody?.message || 'Rate limit or monthly quota limit reached';
        console.warn(`[Outbox Worker] ⚠️ RESEND QUOTA / RATE LIMIT EXCEEDED (HTTP 429): ${errorMsg}`);

        await updateOutboxRow(item.id, {
          status: 'failed',
          attempts: (item.attempts || 0) + 1,
          last_error: `QUOTA_EXCEEDED: ${errorMsg} (HTTP 429)`,
        });

        failedCount += 1;
        // Break out of the loop immediately to prevent hammering rate limits
        break;
      } else {
        // Other HTTP error
        const errorBody = await res.json().catch(() => ({}));
        const errorMsg = errorBody?.message || `HTTP ${res.status} ${res.statusText}`;
        console.error(`[Outbox Worker] Delivery failed for ${item.recipient_email}: ${errorMsg}`);
        const nextAttempts = (item.attempts || 0) + 1;
        const status = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

        await updateOutboxRow(item.id, {
          attempts: nextAttempts,
          status,
          last_error: `Resend API Error: ${errorMsg}`,
        });
        failedCount += 1;
      }
    } catch (networkError) {
      console.error(`[Outbox Worker] Network error for ${item.recipient_email}: ${networkError.message}`);
      const nextAttempts = (item.attempts || 0) + 1;
      const status = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

      await updateOutboxRow(item.id, {
        attempts: nextAttempts,
        status,
        last_error: `Network Exception: ${networkError.message}`,
      });
      failedCount += 1;
    }
  }

  console.log(`[Outbox Worker] Batch completed: ${sentCount} sent, ${failedCount} failed, ${notRequiredCount} not required.`);
  return { processed: items.length, sent: sentCount, failed: failedCount, notRequired: notRequiredCount };
}

// Execution Entrypoint
async function main() {
  console.log('='.repeat(70));
  console.log('  Z Institute Management System — Email Outbox Dispatcher Worker');
  console.log('  Provider: Resend Free Tier | Architecture: Transactional Outbox');
  console.log('='.repeat(70));

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[Outbox Worker] FATAL: SUPABASE_URL and SUPABASE_ANON_KEY/SERVICE_ROLE_KEY must be configured.');
    process.exit(1);
  }

  console.log(`[Outbox Worker] Target Supabase: ${SUPABASE_URL}`);
  console.log(`[Outbox Worker] Sender Identity: ${RESEND_FROM_EMAIL}`);
  console.log(`[Outbox Worker] Resend API Key:  ${RESEND_API_KEY ? 'Configured (Server-Side)' : 'NOT CONFIGURED (Simulation Mode)'}`);
  console.log(`[Outbox Worker] Mode:            ${isRunOnce ? 'Single Run (--once)' : `Daemon (polling every ${pollIntervalSec}s)`}`);

  if (isRunOnce) {
    await processBatch();
    console.log('[Outbox Worker] Single run completed. Exiting.');
    process.exit(0);
  } else {
    // Initial run
    await processBatch();
    // Schedule intervals
    const intervalId = setInterval(async () => {
      await processBatch();
    }, pollIntervalSec * 1000);

    // Handle signals
    const shutdown = () => {
      console.log('\n[Outbox Worker] Shutting down outbox worker gracefully...');
      clearInterval(intervalId);
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

main().catch((err) => {
  console.error('[Outbox Worker] Uncaught Fatal Exception:', err);
  process.exit(1);
});
