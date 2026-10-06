import React, { useState, useEffect, useRef } from 'react';
import { Trade, calculatePlatformFee } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { StatusBadge } from '../components/StatusBadge';
import { CancelTradeButton } from '../components/CancelTradeButton';
import { StripeProgressIndicator } from '../components/StripeProgressIndicator';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  ArrowRight,
  User,
  Package,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react';

interface PaymentPageProps {
  tradeId: string;
  navigate: (path: string) => void;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({ tradeId, navigate }) => {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Card form state for test mode simulation / Stripe authorization
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardZip, setCardZip] = useState('94103');

  const tradeRef = useRef<Trade | null>(null);
  tradeRef.current = trade;

  // Load trade details and listen for real-time changes
  useEffect(() => {
    async function loadTrade() {
      try {
        setLoading(true);
        const res = await fetch(`/api/trades/${tradeId}`);
        if (!res.ok) {
          throw new Error('Trade not found or link has expired');
        }
        const data: Trade = await res.json();
        setTrade(data);

        // If already paid, automatically forward to code screen
        if (data.status === 'paid' || data.status === 'confirmed' || data.status === 'released') {
          navigate(`/trade/${tradeId}/code`);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTrade();

    // Real-time Firestore snapshot listener
    const unsub = onSnapshot(
      doc(db, 'trades', tradeId),
      docSnap => {
        if (docSnap.exists()) {
          const updated = { id: docSnap.id, ...docSnap.data() } as Trade;
          setTrade(updated);
        }
      },
      err => {
        handleFirestoreError(err, OperationType.GET, `trades/${tradeId}`);
      }
    );

    // Active polling fallback every 3 seconds to catch cancellation immediately if seller cancels
    const pollTimer = setInterval(async () => {
      const cur = tradeRef.current;
      if (cur && cur.status === 'pending') {
        try {
          const res = await fetch(`/api/trades/${tradeId}`);
          if (res.ok) {
            const fresh: Trade = await res.json();
            if (fresh.status !== cur.status || fresh.cancelledAt !== cur.cancelledAt) {
              setTrade(fresh);
            }
          }
        } catch (e) {
          // ignore transient poll error
        }
      }
    }, 3000);

    return () => {
      unsub();
      clearInterval(pollTimer);
    };
  }, [tradeId]);

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade) return;

    if (trade.status === 'cancelled') {
      setError('This trade has been cancelled. Payment cannot be authorized.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch(`/api/trades/${trade.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.status === 'cancelled') {
          setTrade(prev => (prev ? { ...prev, status: 'cancelled' } : null));
        }
        throw new Error(data.error || 'Payment hold authorization failed');
      }

      // Success! Redirect to /trade/:id/code
      navigate(`/trade/${trade.id}/code`);
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading trade details...</p>
      </div>
    );
  }

  if (error && !trade) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Trade Not Available</h2>
        <p className="text-sm text-slate-600 mb-6">{error || 'This trade link is invalid.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  if (!trade) return null;

  // Item 4: If seller cancelled (or trade is cancelled), immediately show clear banner and remove "Pay now" button!
  if (trade.status === 'cancelled') {
    const roleText = trade.cancelledBy || 'seller';
    const timeText = trade.cancellationTimeFormatted
      ? ` at ${trade.cancellationTimeFormatted}`
      : trade.cancelledAt
      ? ` at ${new Date(trade.cancelledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      : '';

    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center animate-in fade-in">
        <div className="bg-white border-2 border-rose-300 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <XCircle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-extrabold text-rose-950 mb-2">
            This Trade Has Been Cancelled
          </h2>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-xs text-rose-900 space-y-1.5 text-left">
            <p className="font-bold text-sm text-rose-950">
              This trade was cancelled by the {roleText}{timeText}.
            </p>
            <p className="text-rose-700">
              {trade.cancellationMessage || 'No money was charged to your card.'}
            </p>
            <p className="text-[11px] text-rose-600 font-medium">
              Payment authorization has been disabled to prevent accidental charges.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => navigate(`/trade/${trade.id}/status`)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Cancelled Status Page</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Return to Handoff Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fees breakdown: 6%, minimum $2.00
  const itemPrice = trade.price;
  const platformFee = trade.platformFee ?? calculatePlatformFee(itemPrice);
  const totalCharged = trade.totalAmount ?? Math.round((itemPrice + platformFee) * 100) / 100;

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      {/* Header Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-100">
          <Lock className="w-3 h-3" />
          <span>Stripe Escrow Pre-Authorization</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Authorize Escrow Payment
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Funds are held safely and will not be captured until you confirm the in-person handoff.
        </p>
      </div>

      {/* Item & Seller Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs mb-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Item for Sale
            </span>
          </div>
          <StatusBadge status={trade.status} size="sm" />
        </div>

        <div className="py-3">
          <h2 className="text-lg font-bold text-slate-900">{trade.itemName}</h2>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Seller:{' '}
                <strong className="text-slate-800 font-semibold">
                  {trade.sellerDisplayName || 'Verified Seller'}
                </strong>
              </span>
            </div>
            <div className="text-lg font-extrabold text-slate-900">
              ${itemPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Clear Payment Breakdown per Item 1 */}
        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Item Price</span>
            <span className="font-semibold text-slate-900">${itemPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1">
              <span>Handoff protection fee</span>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-medium">
                6% ($2 min)
              </span>
            </span>
            <span className="font-semibold text-slate-900">${platformFee.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm font-bold">
            <span className="text-slate-900">Total Charged</span>
            <span className="text-blue-700 text-base font-extrabold">
              ${totalCharged.toFixed(2)} USD
            </span>
          </div>

          <p className="text-[11px] text-slate-400 pt-1 leading-tight">
            Seller receives the item price (${itemPrice.toFixed(2)}) in full. The protection fee covers escrow
            hold and dispute coverage.
          </p>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Card Information</span>
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
            Stripe Test Mode
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePayNow} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-600 focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                TEST CARD
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Expires
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={cardExpiry}
                onChange={e => setCardExpiry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-600 focus:outline-none text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                CVC
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cardCvc}
                onChange={e => setCardCvc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-600 focus:outline-none text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Postal
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cardZip}
                onChange={e => setCardZip(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-600 focus:outline-none text-center"
              />
            </div>
          </div>

          {/* Escrow Mechanism Explanation */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Manual Capture Escrow</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Your card will be authorized for <strong>${totalCharged.toFixed(2)}</strong>, but money
              does NOT leave your account until you physically inspect the item and share your 4-digit code.
            </p>
          </div>

          {/* Visual Progress Bar & Loader Indicator during Stripe Pre-Authorization */}
          <StripeProgressIndicator isLoading={processing} type="pay" amount={totalCharged} />

          {/* Pay Now Button */}
          <button
            type="submit"
            disabled={processing}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
          >
            {processing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Escrow Hold with Stripe...</span>
              </div>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay Now (${totalCharged.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Stripe Connect Express</span>
          <button
            onClick={() => navigate(`/trade/${trade.id}/status`)}
            className="text-blue-600 hover:underline"
          >
            View Status Tracker
          </button>
        </div>
      </div>

      {/* Cancel Trade Button for buyer before paying */}
      <div className="flex justify-center">
        <CancelTradeButton
          trade={trade}
          cancelledBy="buyer"
          variant="outline"
          onCancelled={updated => {
            setTrade(updated);
            navigate(`/trade/${updated.id}/status`);
          }}
        />
      </div>
    </div>
  );
};
