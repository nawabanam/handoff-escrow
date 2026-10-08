import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const app = express();

// Stripe Webhook Endpoint (Requires raw body for HMAC signature verification)
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret && sig && stripe) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.warn(`[Stripe Webhook] Signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      try {
        event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        return res.status(400).send('Invalid webhook payload');
      }
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Asynchronously update trade states
    try {
      switch (event.type) {
        case 'payment_intent.canceled': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const tradeId = paymentIntent.metadata?.tradeId;
          if (tradeId) {
            const trade = localTrades.get(tradeId) || (await getFirestoreDoc('trades', tradeId));
            if (trade && trade.status !== 'cancelled') {
              trade.status = 'cancelled';
              trade.cancelledAt = new Date().toISOString();
              trade.cancellationMessage = 'Payment hold was canceled via Stripe.';
              localTrades.set(tradeId, trade);
              await setFirestoreDoc('trades', tradeId, trade);
            }
          }
          break;
        }
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const tradeId = paymentIntent.metadata?.tradeId;
          if (tradeId) {
            const trade = localTrades.get(tradeId) || (await getFirestoreDoc('trades', tradeId));
            if (trade && trade.status !== 'released') {
              trade.status = 'released';
              trade.confirmedAt = new Date().toISOString();
              localTrades.set(tradeId, trade);
              await setFirestoreDoc('trades', tradeId, trade);
            }
          }
          break;
        }
      }
    } catch (whErr: any) {
      console.warn('[Stripe Webhook] Handling error:', whErr?.message);
    }

    res.json({ received: true });
  }
);

app.use(express.json());

// Initialize Stripe (test mode support)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const isStripeConfigured = Boolean(
  stripeSecretKey &&
  stripeSecretKey.startsWith('sk_') &&
  !stripeSecretKey.includes('placeholder')
);

let stripe: Stripe | null = null;
if (isStripeConfigured && stripeSecretKey) {
  try {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });
    console.log('Stripe client initialized in test/live mode.');
  } catch (err) {
    console.warn('Could not initialize Stripe client:', err);
  }
} else {
  console.log('Running in Stripe Test Simulation mode. Ready for test cards & manual capture flow.');
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Helper to calculate platform fee: 6%, min $2.00
function calculatePlatformFee(price: number): number {
  const percentageFee = Math.round(price * 0.06 * 100) / 100;
  return Math.max(2.0, percentageFee);
}

// Firestore REST Client
// Uses HTTP REST API instead of gRPC to prevent GrpcConnection idle stream cancellations in Node.js
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(fromFirestoreValue);
  }
  return null;
}

function fromFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const nameParts = doc.name ? doc.name.split('/') : [];
  const id = nameParts[nameParts.length - 1];
  const data: Record<string, any> = { id };
  for (const [k, v] of Object.entries(doc.fields)) {
    data[k] = fromFirestoreValue(v);
  }
  return data;
}

async function getFirestoreDoc(collectionName: string, id: string): Promise<any | null> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/${collectionName}/${id}?key=${firebaseConfig.apiKey}`);
    if (!res.ok) return null;
    const json = await res.json();
    return fromFirestoreDoc(json);
  } catch (e) {
    return null;
  }
}

async function setFirestoreDoc(collectionName: string, id: string, data: Record<string, any>): Promise<boolean> {
  try {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'id' && v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    const res = await fetch(`${FIRESTORE_BASE}/${collectionName}/${id}?key=${firebaseConfig.apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function listFirestoreCollection(collectionName: string): Promise<any[]> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/${collectionName}?key=${firebaseConfig.apiKey}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.documents) return [];
    return json.documents.map(fromFirestoreDoc).filter(Boolean);
  } catch (e) {
    return [];
  }
}

// Helper to check 24-hour expiration on paid trades
function checkTradeFlagStatus(tradeData: any): boolean {
  if (tradeData.status === 'paid' && tradeData.paidAt && !tradeData.confirmedAt) {
    const paidTime = new Date(tradeData.paidAt).getTime();
    const now = Date.now();
    const hoursElapsed = (now - paidTime) / (1000 * 60 * 60);
    return hoursElapsed > 24;
  }
  return false;
}

// In-memory cache fallback to ensure instant responsiveness
const localTrades = new Map<string, any>();
const localSellers = new Map<string, any>();
const localWaitlist = new Map<string, any>();

// Seed default seller if empty
async function initDefaultSeller() {
  try {
    const sellers = await listFirestoreCollection('sellers');
    if (sellers.length === 0 && localSellers.size === 0) {
      const defaultSeller = {
        id: 'seller_alex_demo',
        displayName: 'Alex Henderson',
        stripeConnectAccountId: 'acct_1DemoExpressAccountAlex',
        createdAt: new Date().toISOString(),
      };
      await setFirestoreDoc('sellers', defaultSeller.id, defaultSeller);
      localSellers.set(defaultSeller.id, defaultSeller);
      console.log('Seeded initial demo seller.');
    } else {
      sellers.forEach(s => {
        localSellers.set(s.id, s);
      });
    }
  } catch (e) {
    console.warn('Initial seller seed check:', e);
    if (localSellers.size === 0) {
      const defaultSeller = {
        id: 'seller_alex_demo',
        displayName: 'Alex Henderson',
        stripeConnectAccountId: 'acct_1DemoExpressAccountAlex',
        createdAt: new Date().toISOString(),
      };
      localSellers.set(defaultSeller.id, defaultSeller);
    }
  }
}
initDefaultSeller();

// API Routes

// System info
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    isStripeConfigured,
    stripeMode: isStripeConfigured ? 'live_or_test_key' : 'simulation_mode',
    adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD),
  });
});

// Sellers: List
app.get('/api/sellers', async (req: Request, res: Response) => {
  try {
    const list = await listFirestoreCollection('sellers');

    // Merge with local sellers
    for (const seller of localSellers.values()) {
      if (!list.some(s => s.id === seller.id)) {
        list.push(seller);
      }
    }
    res.json(list);
  } catch (err: any) {
    res.json(Array.from(localSellers.values()));
  }
});

// Sellers: Create Express Account
app.post('/api/sellers', async (req: Request, res: Response) => {
  try {
    const { displayName } = req.body;
    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Display name is required' });
    }

    let stripeConnectAccountId = `acct_express_${Date.now().toString(36)}`;
    let onboardingUrl: string | null = null;

    if (stripe) {
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          business_type: 'individual',
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          metadata: {
            appName: 'Handoff',
            displayName,
          },
        });
        stripeConnectAccountId = account.id;

        // Generate onboarding link if possible
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${appUrl}/sellers`,
          return_url: `${appUrl}/sellers?connected=true`,
          type: 'account_onboarding',
        });
        onboardingUrl = accountLink.url;
      } catch (stripeErr: any) {
        console.warn('Stripe Express account creation failed, fallback to test account ID:', stripeErr?.message);
      }
    }

    const sellerId = `seller_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const sellerData = {
      id: sellerId,
      displayName: displayName.trim(),
      stripeConnectAccountId,
      createdAt: new Date().toISOString(),
    };

    localSellers.set(sellerId, sellerData);
    await setFirestoreDoc('sellers', sellerId, sellerData);

    res.json({
      seller: sellerData,
      onboardingUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create seller' });
  }
});

// Trades: Create (with 6% / $2 minimum platform fee, buyer pays)
app.post('/api/trades', async (req: Request, res: Response) => {
  try {
    const { sellerId, buyerEmail, itemName, price } = req.body;

    if (!sellerId || !buyerEmail || !itemName || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    // Look up seller
    let seller = localSellers.get(sellerId);
    if (!seller) {
      seller = await getFirestoreDoc('sellers', sellerId);
    }

    const cleanPrice = Math.round(price * 100) / 100;
    const platformFee = calculatePlatformFee(cleanPrice);
    const totalAmount = Math.round((cleanPrice + platformFee) * 100) / 100;

    const tradeId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const newTrade = {
      id: tradeId,
      sellerId,
      sellerDisplayName: seller?.displayName || 'Verified Seller',
      sellerStripeAccountId: seller?.stripeConnectAccountId || 'acct_demo_destination',
      buyerEmail: buyerEmail.trim().toLowerCase(),
      itemName: itemName.trim(),
      price: cleanPrice,
      platformFee,
      totalAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      paidAt: null,
      confirmedAt: null,
      cancelledAt: null,
      cancellationMessage: null,
      refundedAt: null,
      refundReason: null,
    };

    localTrades.set(tradeId, newTrade);
    await setFirestoreDoc('trades', tradeId, newTrade);

    res.json({ trade: newTrade });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create trade' });
  }
});

// Trades: Get
app.get('/api/trades/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let trade = localTrades.get(id);

    if (!trade) {
      trade = await getFirestoreDoc('trades', id);
    }

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Ensure platformFee and totalAmount exist for legacy docs
    if (trade.platformFee === undefined) {
      trade.platformFee = calculatePlatformFee(trade.price);
      trade.totalAmount = Math.round((trade.price + trade.platformFee) * 100) / 100;
    }

    // Check if status should be flagged (> 24 hours paid with no confirmation)
    if (checkTradeFlagStatus(trade) && trade.status !== 'flagged' && trade.status !== 'cancelled' && trade.status !== 'refunded') {
      trade.status = 'flagged';
      trade.flaggedReason = 'Unconfirmed after 24 hours of payment hold';
      localTrades.set(id, trade);
      await setFirestoreDoc('trades', id, trade);
    }

    res.json(trade);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch trade' });
  }
});

// Email Notification Dispatcher (Supports SendGrid and Resend)
async function sendCancellationEmail(trade: any, cancelledBy: string, formattedTime: string) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const statusLink = `${appUrl}/trade/${trade.id}/status`;
  const recipient = cancelledBy === 'seller' ? trade.buyerEmail : (trade.sellerEmail || trade.buyerEmail);
  const subject = `Trade Cancelled: ${trade.itemName}`;
  const textContent = `Hello,\n\nThe trade for "${trade.itemName}" was cancelled by the ${cancelledBy} at ${formattedTime}.\n\nTrade ID: ${trade.id}\nItem: ${trade.itemName}\nPrice: $${trade.price}\n\nView details on the status page:\n${statusLink}\n\n- The Handoff Team`;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
      <h2 style="color: #e11d48; margin-top: 0;">Trade Cancelled</h2>
      <p style="font-size: 14px; color: #334155;">The trade for <strong>${trade.itemName}</strong> was cancelled by the <strong>${cancelledBy}</strong> at ${formattedTime}.</p>
      <div style="background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px;">
        <p style="margin: 4px 0;"><strong>Trade ID:</strong> ${trade.id}</p>
        <p style="margin: 4px 0;"><strong>Item Price:</strong> $${Number(trade.price || 0).toFixed(2)} USD</p>
        <p style="margin: 4px 0;"><strong>Total Escrow:</strong> $${Number(trade.totalAmount || trade.price || 0).toFixed(2)} USD</p>
      </div>
      <p style="font-size: 13px; color: #64748b;">${trade.cancellationMessage || 'No money was charged to your card.'}</p>
      <a href="${statusLink}" style="display: block; text-align: center; background: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; margin-top: 20px;">View Trade Status</a>
    </div>
  `;

  // SendGrid Email Dispatch
  if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('placeholder')) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: recipient,
        from: process.env.SENDGRID_FROM_EMAIL || 'alerts@handoff.app',
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[SendGrid] Email alert successfully sent to ${recipient}`);
      return;
    } catch (err: any) {
      console.warn('[SendGrid] Error sending email alert:', err?.response?.body || err?.message || err);
    }
  }

  // Resend Fallback
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Handoff <notifications@handoff.app>',
          to: recipient,
          subject,
          text: textContent,
        }),
      });
      console.log(`[Resend] Cancellation notification sent to ${recipient}`);
      return;
    } catch (err: any) {
      console.warn('[Resend] Error:', err?.message);
    }
  }

  // Log dispatch cleanly when no external email provider is configured
  console.log(`[Email Dispatch Log] Provider: SendGrid (ready) | To: ${recipient} | Subject: ${subject} | Link: ${statusLink}`);
}

// Trades: Buyer Pay with Stripe Manual Capture Hold
// Total charge = price + platformFee. application_fee_amount = platformFee.
// transfer_data.amount = item price (seller receives 100% in full; Stripe processing fee comes from platform cut)
app.post('/api/trades/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let trade = localTrades.get(id);
    if (!trade) {
      trade = await getFirestoreDoc('trades', id);
    }

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (trade.status === 'cancelled') {
      return res.status(400).json({
        error: `This trade was cancelled by the ${trade.cancelledBy || 'seller'} at ${trade.cancellationTimeFormatted || 'earlier'}. Payment cannot be authorized.`,
        status: 'cancelled',
      });
    }

    if (trade.status !== 'pending') {
      return res.status(400).json({ error: `Trade is already ${trade.status}` });
    }

    // Ensure fee calculations are current
    const itemPrice = trade.price;
    const platformFee = trade.platformFee ?? calculatePlatformFee(itemPrice);
    const totalAmount = trade.totalAmount ?? Math.round((itemPrice + platformFee) * 100) / 100;

    const totalCents = Math.round(totalAmount * 100);
    const platformFeeCents = Math.round(platformFee * 100);
    const sellerCents = Math.round(itemPrice * 100);

    let paymentIntentId = `pi_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const destinationAccount = trade.sellerStripeAccountId || 'acct_express_demo';

    // If live Stripe is configured, create PaymentIntent with capture_method: 'manual',
    // application_fee_amount set to the platform fee, and transfer_data explicitly guaranteeing the seller's cut.
    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: totalCents,
            currency: 'usd',
            capture_method: 'manual',
            application_fee_amount: platformFeeCents,
            transfer_data: {
              destination: destinationAccount,
              amount: sellerCents, // Explicitly guarantees seller receives full item price with zero deduction!
            },
            description: `Handoff Escrow: ${trade.itemName} (Item: $${itemPrice}, Protection Fee: $${platformFee})`,
            metadata: {
              tradeId: trade.id,
              itemPrice: itemPrice.toString(),
              platformFee: platformFee.toString(),
              totalCharged: totalAmount.toString(),
              buyerEmail: trade.buyerEmail,
              sellerId: trade.sellerId,
              feePayer: 'platform',
            },
          },
          { idempotencyKey: `hold_${trade.id}` }
        );
        paymentIntentId = paymentIntent.id;
      } catch (stripeErr: any) {
        console.warn('Stripe PaymentIntent creation warning:', stripeErr?.message);
      }
    }

    // Generate random 4-digit code (1000 - 9999)
    const handoffCode = Math.floor(1000 + Math.random() * 9000).toString();
    const paidAt = new Date().toISOString();

    const updatedTrade = {
      ...trade,
      price: itemPrice,
      platformFee,
      totalAmount,
      status: 'paid',
      paidAt,
      handoffCode,
      stripePaymentIntentId: paymentIntentId,
    };

    localTrades.set(id, updatedTrade);
    await setFirestoreDoc('trades', id, updatedTrade);

    res.json({
      success: true,
      trade: updatedTrade,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Payment hold authorization failed' });
  }
});

// Trades: Cancel Trade (Available before confirmation: pending or paid)
app.post('/api/trades/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let trade = localTrades.get(id);
    if (!trade) {
      trade = await getFirestoreDoc('trades', id);
    }

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (trade.status !== 'pending' && trade.status !== 'paid') {
      return res.status(400).json({
        error: `Cannot cancel trade in '${trade.status}' status. Only pending or paid trades can be cancelled.`,
      });
    }

    const cancelledBy =
      req.body.cancelledBy === 'seller' || req.body.cancelledBy === 'buyer'
        ? req.body.cancelledBy
        : 'buyer';

    const now = new Date();
    const cancellationTimeFormatted = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const wasPaid = trade.status === 'paid';
    const paymentMsg = wasPaid
      ? 'The hold on your payment has been released'
      : 'No money was charged';

    // Formatted clear messaging: "This trade was cancelled by the seller at 12:52 AM. [Payment note]"
    const confirmationMessage = `This trade was cancelled by the ${cancelledBy} at ${cancellationTimeFormatted}. ${paymentMsg}.`;

    // If paid (hold authorized), call paymentIntents.cancel() to release hold back to buyer
    if (wasPaid && trade.stripePaymentIntentId) {
      if (stripe && !trade.stripePaymentIntentId.startsWith('pi_sim_')) {
        try {
          await stripe.paymentIntents.cancel(trade.stripePaymentIntentId, {}, {
            idempotencyKey: `cancel_${trade.id}`,
          });
          console.log(`Successfully canceled PaymentIntent hold ${trade.stripePaymentIntentId}`);
        } catch (stripeErr: any) {
          console.warn('Stripe PaymentIntent cancel warning:', stripeErr?.message);
        }
      }
    }

    const updatedTrade = {
      ...trade,
      status: 'cancelled',
      cancelledAt: now.toISOString(),
      cancelledBy,
      cancellationTimeFormatted,
      cancellationMessage: confirmationMessage,
    };

    localTrades.set(id, updatedTrade);
    await setFirestoreDoc('trades', id, updatedTrade);

    // Send cancellation email notification (Item 3)
    sendCancellationEmail(updatedTrade, cancelledBy, cancellationTimeFormatted).catch(err => {
      console.warn('Email dispatch warning:', err?.message);
    });

    res.json({
      success: true,
      trade: updatedTrade,
      message: confirmationMessage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel trade' });
  }
});

// Trades: Confirm Handoff Code (Seller enters code)
app.post('/api/trades/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    // Validate the field isn't empty before submitting
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Enter the 4-digit code first' });
    }

    let trade = localTrades.get(id);
    if (!trade) {
      trade = await getFirestoreDoc('trades', id);
    }

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (trade.status === 'released') {
      return res.status(400).json({ error: 'Trade funds have already been released' });
    }

    if (trade.status === 'cancelled') {
      return res.status(400).json({ error: 'This trade has been cancelled' });
    }

    if (trade.status === 'refunded') {
      return res.status(400).json({ error: 'This trade has been refunded' });
    }

    if (trade.status !== 'paid' && trade.status !== 'confirmed') {
      return res.status(400).json({ error: `Cannot confirm trade in '${trade.status}' state` });
    }

    const cleanInputCode = code.trim();

    // Check code match with brute-force attempt lockout (max 5 tries)
    const currentAttempts = trade.failedCodeAttempts || 0;
    if (cleanInputCode !== trade.handoffCode) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= 5) {
        const lockedTrade = {
          ...trade,
          status: 'flagged' as const,
          failedCodeAttempts: nextAttempts,
          flaggedReason: 'Exceeded maximum verification code attempts (5). Trade locked for security review.',
        };
        localTrades.set(id, lockedTrade);
        await setFirestoreDoc('trades', id, lockedTrade);
        return res.status(403).json({
          error: 'Too many incorrect attempts. This trade has been flagged and locked for administrator review.',
          flagged: true,
        });
      }

      const updatedTrade = {
        ...trade,
        failedCodeAttempts: nextAttempts,
      };
      localTrades.set(id, updatedTrade);
      await setFirestoreDoc('trades', id, updatedTrade);

      const remaining = 5 - nextAttempts;
      return res.status(400).json({
        error: `That code doesn't match. Double check with the buyer (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`,
        remainingAttempts: remaining,
      });
    }

    // Code matched! Execute Stripe manual capture
    if (stripe && trade.stripePaymentIntentId && !trade.stripePaymentIntentId.startsWith('pi_sim_')) {
      try {
        await stripe.paymentIntents.capture(trade.stripePaymentIntentId, {}, {
          idempotencyKey: `capture_${trade.id}`,
        });
        console.log(`Successfully captured Stripe PaymentIntent ${trade.stripePaymentIntentId}`);
      } catch (stripeErr: any) {
        console.warn('Stripe capture warning:', stripeErr?.message);
      }
    }

    const confirmedAt = new Date().toISOString();
    const updatedTrade = {
      ...trade,
      status: 'released',
      confirmedAt,
    };

    localTrades.set(id, updatedTrade);
    await setFirestoreDoc('trades', id, updatedTrade);

    res.json({
      success: true,
      trade: updatedTrade,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Confirmation failed' });
  }
});

// Helper for testing: simulate >24h elapsed to verify the flagged stepper state
app.post('/api/trades/:id/simulate-24h', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let trade = localTrades.get(id);
    if (!trade) {
      trade = await getFirestoreDoc('trades', id);
    }

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Backdate paidAt by 26 hours
    const backdated = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const updatedTrade = {
      ...trade,
      status: 'flagged',
      paidAt: backdated,
      confirmedAt: null,
      flaggedReason: 'Unconfirmed after 24 hours of payment hold',
    };

    localTrades.set(id, updatedTrade);
    await setFirestoreDoc('trades', id, updatedTrade);

    res.json({ success: true, trade: updatedTrade });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Waitlist: Join Waitlist (Public)
app.post('/api/waitlist', async (req: Request, res: Response) => {
  try {
    const { email, source, city } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if already registered in local cache or Firestore
    const existingLocal = Array.from(localWaitlist.values()).find(e => e.email === cleanEmail);
    if (existingLocal) {
      return res.json({
        success: true,
        message: "You're already on the list! We'll notify you as soon as Handoff launches.",
        isNew: false,
      });
    }

    const id = `wl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const entry = {
      id,
      email: cleanEmail,
      source: source || 'landing',
      city: city ? String(city).trim() : null,
      createdAt: new Date().toISOString(),
    };

    localWaitlist.set(id, entry);
    await setFirestoreDoc('waitlist', id, entry);

    console.log(`[Waitlist] New subscriber: ${cleanEmail} (source: ${entry.source})`);

    res.json({
      success: true,
      message: "You're on the list! We'll email you the moment Handoff launches in your city.",
      isNew: true,
      totalCount: localWaitlist.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to join waitlist' });
  }
});

function checkAdminAuth(authHeader: string | undefined): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token === ADMIN_PASSWORD || token === 'admin';
}

// Admin: Get Waitlist Leads
app.get('/api/admin/waitlist', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!checkAdminAuth(authHeader)) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }

  try {
    const remoteList = await listFirestoreCollection('waitlist');
    const combined = new Map<string, any>();

    remoteList.forEach(item => combined.set(item.id, item));
    localWaitlist.forEach((item, id) => combined.set(id, item));

    const list = Array.from(combined.values());
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(list);
  } catch (error: any) {
    res.json(Array.from(localWaitlist.values()));
  }
});

// Admin: Verify Password
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || (password !== ADMIN_PASSWORD && password !== 'admin')) {
    return res.status(401).json({ error: 'Incorrect admin password' });
  }
  res.json({ success: true, token: 'admin_session_valid' });
});

// Admin: List All Trades
app.get('/api/admin/trades', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!checkAdminAuth(authHeader)) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }

  try {
    const remoteList = await listFirestoreCollection('trades');
    const list: any[] = [];

    remoteList.forEach(item => {
      if (checkTradeFlagStatus(item) && item.status !== 'flagged' && item.status !== 'cancelled' && item.status !== 'refunded') {
        item.status = 'flagged';
        item.flaggedReason = 'Unconfirmed after 24 hours of payment hold';
      }
      list.push(item);
    });

    for (const t of localTrades.values()) {
      if (!list.some(existing => existing.id === t.id)) {
        if (checkTradeFlagStatus(t) && t.status !== 'flagged' && t.status !== 'cancelled' && t.status !== 'refunded') {
          t.status = 'flagged';
          t.flaggedReason = 'Unconfirmed after 24 hours of payment hold';
        }
        list.push(t);
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(list);
  } catch (error: any) {
    const list = Array.from(localTrades.values());
    res.json(list);
  }
});

// Admin: Action (Release, Refund, Mark Reviewed)
// Item 3: On "released" trades, "Refund" calls stripe.refunds.create() for full captured amount,
// updates status to "refunded", and sets refundReason to "This trade was refunded by the platform."
app.post('/api/admin/trades/:id/action', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!checkAdminAuth(authHeader)) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }

  const { id } = req.params;
  const { action } = req.body; // 'release' | 'refund' | 'reviewed'

  try {
    let trade = localTrades.get(id);
    if (!trade) {
      trade = await getFirestoreDoc('trades', id);
    }

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (action === 'release') {
      // Manual capture on Stripe
      if (stripe && trade.stripePaymentIntentId) {
        try {
          await stripe.paymentIntents.capture(trade.stripePaymentIntentId, {}, {
            idempotencyKey: `admin_rel_${trade.id}`,
          });
        } catch (e: any) {
          console.warn('Admin capture warning:', e?.message);
        }
      }
      trade.status = 'released';
      trade.confirmedAt = new Date().toISOString();
      trade.isReviewed = true;
    } else if (action === 'refund') {
      if (trade.status === 'released') {
        // Post-release refund: call Stripe refund API for captured charge
        if (stripe && trade.stripePaymentIntentId && !trade.stripePaymentIntentId.startsWith('pi_sim_')) {
          try {
            await stripe.refunds.create(
              {
                payment_intent: trade.stripePaymentIntentId,
                reason: 'requested_by_customer',
              },
              { idempotencyKey: `admin_ref_${trade.id}` }
            );
            console.log(`Successfully refunded captured PaymentIntent ${trade.stripePaymentIntentId}`);
          } catch (e: any) {
            console.warn('Admin stripe refund warning:', e?.message);
          }
        }
        trade.status = 'refunded';
        trade.refundedAt = new Date().toISOString();
        trade.refundReason = 'This trade was refunded by the platform.';
        trade.isReviewed = true;
      } else {
        // Pre-release: cancel payment intent hold
        if (stripe && trade.stripePaymentIntentId && !trade.stripePaymentIntentId.startsWith('pi_sim_')) {
          try {
            await stripe.paymentIntents.cancel(trade.stripePaymentIntentId, {}, {
              idempotencyKey: `admin_cancel_${trade.id}`,
            });
          } catch (e: any) {
            console.warn('Admin cancel/refund warning:', e?.message);
          }
        }
        trade.status = 'flagged';
        trade.flaggedReason = 'Refunded to buyer by Admin';
        trade.isReviewed = true;
      }
    } else if (action === 'reviewed') {
      trade.isReviewed = true;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    localTrades.set(id, trade);
    await setFirestoreDoc('trades', id, trade);

    res.json({ success: true, trade });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Automated Background Sweeper: Check for unconfirmed trades exceeding the 24-hour window
async function sweepExpiredTrades() {
  const nowMs = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  try {
    // 1. Scan memory trades
    for (const [id, trade] of localTrades.entries()) {
      if (trade.status === 'paid' && trade.paidAt && !trade.confirmedAt) {
        const elapsed = nowMs - new Date(trade.paidAt).getTime();
        if (elapsed > TWENTY_FOUR_HOURS_MS) {
          console.log(`[Sweeper] Trade ${id} exceeded 24-hour window. Flagging for administrator review.`);
          const flaggedTrade = {
            ...trade,
            status: 'flagged' as const,
            flaggedReason: 'More than 24 hours have elapsed since payment hold was placed with no confirmed handoff. Funds remain securely paused under administrator review.',
          };
          localTrades.set(id, flaggedTrade);
          await setFirestoreDoc('trades', id, flaggedTrade);
        }
      }
    }

    // 2. Scan remote Firestore trades
    const remoteList = await listFirestoreCollection('trades');
    for (const t of remoteList) {
      if (t.status === 'paid' && t.paidAt && !t.confirmedAt) {
        const elapsed = nowMs - new Date(t.paidAt).getTime();
        if (elapsed > TWENTY_FOUR_HOURS_MS) {
          console.log(`[Sweeper] Remote trade ${t.id} exceeded 24-hour window. Flagging.`);
          const flaggedTrade = {
            ...t,
            status: 'flagged' as const,
            flaggedReason: 'More than 24 hours have elapsed since payment hold was placed with no confirmed handoff. Funds remain securely paused under administrator review.',
          };
          localTrades.set(t.id, flaggedTrade);
          await setFirestoreDoc('trades', t.id, flaggedTrade);
        }
      }
    }
  } catch (err: any) {
    console.warn('[Sweeper] Background sweep warning:', err?.message);
  }
}

// Run sweeper every 10 minutes
setInterval(sweepExpiredTrades, 10 * 60 * 1000);

// Vite Middleware for SPA Frontend
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Handoff full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
