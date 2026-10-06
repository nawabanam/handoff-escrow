import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Firebase Cloud Function (v2 Firestore Trigger):
 * Triggers when a trade in the 'trades' collection changes status to 'cancelled'.
 * Sends an email alert using SendGrid to the counter-party with trade details and a link to the status page.
 */
export const onTradeCancelled = onDocumentUpdated(
  {
    document: 'trades/{tradeId}',
    region: 'us-west2', // matches applet cloud run region
    secrets: ['SENDGRID_API_KEY'],
  },
  async event => {
    const change = event.data;
    if (!change) {
      logger.warn('No document data present in Firestore change event');
      return;
    }

    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Verify status transition to 'cancelled'
    if (!beforeData || !afterData) return;
    if (beforeData.status === 'cancelled' || afterData.status !== 'cancelled') {
      return; // Only trigger on initial cancellation transition
    }

    const tradeId = event.params.tradeId;
    const trade = afterData;

    logger.info(`Trade ${tradeId} changed status to 'cancelled'. Dispatching SendGrid email alert...`);

    // Resolve SendGrid API key and sender email
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@handoff.app';
    const appUrl = process.env.APP_URL || 'https://ais-pre-cepyfemmg6gxfwy5tfd3os-383627034114.us-west2.run.app';
    const statusPageUrl = `${appUrl}/trade/${tradeId}/status`;

    const cancelledBy = trade.cancelledBy || 'other party';
    const timeFormatted = trade.cancellationTimeFormatted || 'recently';
    const wasPaid = Boolean(trade.paidAt);
    const holdMessage = wasPaid
      ? 'The hold on the payment has been released via Stripe. No funds were captured.'
      : 'No funds were charged to the payment card.';

    // Determine recipient: if cancelled by seller, notify buyer; if cancelled by buyer, notify seller if email present
    const recipientEmail =
      cancelledBy === 'seller' ? trade.buyerEmail : (trade.sellerEmail || trade.buyerEmail);

    if (!recipientEmail) {
      logger.warn(`No recipient email address available for trade ${tradeId}`);
      return;
    }

    // Build plain text message
    const textBody = `
Trade Cancelled Alert: ${trade.itemName || 'Handoff Trade'}
--------------------------------------------------------
Trade ID: ${tradeId}
Item: ${trade.itemName || 'Item'}
Agreed Price: $${Number(trade.price || 0).toFixed(2)} USD
Total Escrow Amount: $${Number(trade.totalAmount || trade.price || 0).toFixed(2)} USD

Status: CANCELLED
Cancelled By: ${cancelledBy} at ${timeFormatted}
Payment Note: ${holdMessage}

View the full details on the status page:
${statusPageUrl}

---
Handoff Escrow Protection
Safe in-person trades with Stripe pre-authorization hold.
`.trim();

    // Build styled HTML email
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { background-color: #ffffff; max-width: 560px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #f43f5e; color: #ffffff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px; }
    .item-box { background-color: #f1f5f9; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
    .item-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .item-meta { font-size: 13px; color: #64748b; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .details-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .details-table td.label { color: #64748b; font-weight: 500; }
    .details-table td.value { text-align: right; color: #0f172a; font-weight: 600; }
    .alert-banner { background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #9f1239; line-height: 1.4; }
    .button { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background-color: #0f172a; color: #ffffff !important; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 8px; }
    .footer { padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Trade Cancelled</h1>
      <p>Notification regarding trade #${tradeId.slice(0, 10)}</p>
    </div>
    <div class="content">
      <div class="item-box">
        <div class="item-title">${trade.itemName || 'Handoff Trade'}</div>
        <div class="item-meta">Seller: ${trade.sellerDisplayName || 'Verified Seller'}</div>
      </div>

      <div class="alert-banner">
        <strong>Cancelled by ${cancelledBy} at ${timeFormatted}.</strong><br>
        ${holdMessage}
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Trade ID</td>
          <td class="value" style="font-family: monospace;">${tradeId}</td>
        </tr>
        <tr>
          <td class="label">Item Price</td>
          <td class="value">$${Number(trade.price || 0).toFixed(2)} USD</td>
        </tr>
        <tr>
          <td class="label">Platform Protection Fee</td>
          <td class="value">$${Number(trade.platformFee || 0).toFixed(2)} USD</td>
        </tr>
        <tr>
          <td class="label">Total Amount</td>
          <td class="value" style="font-size: 15px; color: #2563eb;">$${Number(trade.totalAmount || trade.price || 0).toFixed(2)} USD</td>
        </tr>
        <tr>
          <td class="label">Status</td>
          <td class="value" style="color: #e11d48; text-transform: uppercase;">Cancelled</td>
        </tr>
      </table>

      <a href="${statusPageUrl}" class="button" target="_blank">View Trade Status Page</a>
    </div>
    <div class="footer">
      This is an automated notification from Handoff Escrow.<br>
      Pre-authorized Stripe holds are automatically released upon cancellation.
    </div>
  </div>
</body>
</html>
`.trim();

    if (!sendgridApiKey || sendgridApiKey.includes('placeholder')) {
      logger.info(
        `[SendGrid Simulated Alert] SENDGRID_API_KEY not configured. Alert logged successfully:
To: ${recipientEmail}
Subject: Trade Cancelled: ${trade.itemName || 'Item'}
Status Link: ${statusPageUrl}`
      );
      return;
    }

    try {
      sgMail.setApiKey(sendgridApiKey);
      const msg = {
        to: recipientEmail,
        from: fromEmail,
        subject: `Trade Cancelled: ${trade.itemName || 'Item'}`,
        text: textBody,
        html: htmlBody,
      };

      const [response] = await sgMail.send(msg);
      logger.info(`SendGrid email alert sent successfully to ${recipientEmail}. Status code: ${response.statusCode}`);
    } catch (err: any) {
      logger.error('Failed to send email alert via SendGrid:', err?.response?.body || err?.message || err);
    }
  }
);
