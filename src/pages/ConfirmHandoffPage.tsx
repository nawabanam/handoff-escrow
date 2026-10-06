import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CancelTradeButton } from '../components/CancelTradeButton';
import { StripeProgressIndicator } from '../components/StripeProgressIndicator';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Package,
  Clock,
  Sparkles,
  ExternalLink,
  XCircle,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ConfirmHandoffPageProps {
  tradeId: string;
  navigate: (path: string) => void;
}

export const ConfirmHandoffPage: React.FC<ConfirmHandoffPageProps> = ({ tradeId, navigate }) => {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadTrade() {
      try {
        const res = await fetch(`/api/trades/${tradeId}`);
        if (!res.ok) throw new Error('Trade not found');
        const data: Trade = await res.json();
        setTrade(data);
        if (data.status === 'released') {
          setSuccess(true);
        }
      } catch (err: any) {
        setInlineError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTrade();

    // Firestore real-time listener
    const unsub = onSnapshot(
      doc(db, 'trades', tradeId),
      docSnap => {
        if (docSnap.exists()) {
          const updated = { id: docSnap.id, ...docSnap.data() } as Trade;
          setTrade(updated);
          if (updated.status === 'released') {
            setSuccess(true);
          }
        }
      },
      err => {
        handleFirestoreError(err, OperationType.GET, `trades/${tradeId}`);
      }
    );

    return () => unsub();
  }, [tradeId]);

  const handleConfirmHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    // Validate the field isn't empty before submitting
    const trimmed = code.trim();
    if (!trimmed) {
      setInlineError('Enter the 4-digit code first');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.flagged) {
          setTrade(prev => (prev ? { ...prev, status: 'flagged' } : null));
        }
        throw new Error(data.error || "That code doesn't match. Double check with the buyer");
      }

      setTrade(data.trade);
      setSuccess(true);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err: any) {
      setInlineError(err.message || "That code doesn't match. Double check with the buyer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading trade verification...</p>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Trade Not Found</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Handle cancelled state per Item 2
  if (trade.status === 'cancelled') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center animate-in fade-in">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Trade Cancelled</h2>
          <p className="text-sm font-medium text-slate-700 max-w-xs mx-auto mb-6">
            {trade.cancellationMessage || 'This trade was cancelled. The hold on payment has been released.'}
          </p>
          <button
            onClick={() => navigate(`/trade/${trade.id}/status`)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
          >
            View Status Tracker
          </button>
        </div>
      </div>
    );
  }

  // Handle refunded state per Item 3
  if (trade.status === 'refunded') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center animate-in fade-in">
        <div className="bg-white border border-purple-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-200">
            <RotateCcw className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-purple-950 mb-2">Trade Refunded</h2>
          <p className="text-sm font-medium text-purple-850 max-w-xs mx-auto mb-6">
            {trade.refundReason || 'This trade was refunded by the platform.'}
          </p>
          <button
            onClick={() => navigate(`/trade/${trade.id}/status`)}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-sm font-semibold transition-colors"
          >
            View Status Tracker
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-100">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Seller Verification</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {success ? 'Funds Released!' : 'Confirm Item Handoff'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          {success
            ? 'Stripe manual capture completed. Funds are moving to your account.'
            : 'Ask the buyer for their 4-digit code once you hand them the item.'}
        </p>
      </div>

      {/* Trade Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sale Item
            </span>
          </div>
          <span className="text-base font-extrabold text-blue-700">
            ${trade.price.toFixed(2)} USD
          </span>
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-900">{trade.itemName}</div>
        <div className="mt-1 text-xs text-slate-500">
          Buyer: <span className="text-slate-800">{trade.buyerEmail}</span>
        </div>
      </div>

      {/* Main Confirmation Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-4">
        {success ? (
          <div className="text-center py-4 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Payment Released!</h2>
            <p className="text-sm text-slate-600 mb-5">
              The 4-digit code matched. Your full item payout of{' '}
              <strong className="text-blue-700 font-bold">${trade.price.toFixed(2)}</strong> has been captured
              and transferred to your Stripe Express account.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 font-mono space-y-1 text-left mb-5">
              <div>Stripe Intent: {trade.stripePaymentIntentId || 'Captured'}</div>
              <div>Confirmed: {trade.confirmedAt ? new Date(trade.confirmedAt).toLocaleString() : 'Just now'}</div>
            </div>

            <button
              onClick={() => navigate(`/trade/${trade.id}/status`)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Completed Status Page</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmHandoff} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                Enter Buyer's 4-Digit Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={code}
                onChange={e => {
                  setCode(e.target.value.replace(/[^0-9]/g, ''));
                  if (inlineError) setInlineError(null);
                }}
                className={`w-full py-3 text-center font-mono text-3xl font-extrabold tracking-[0.4em] bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-none transition-colors ${
                  inlineError
                    ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                    : 'border-slate-300 focus:border-blue-600'
                }`}
              />
            </div>

            {/* Inline Error Message */}
            {inlineError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-medium">{inlineError}</span>
              </div>
            )}

            {/* Visual Progress Bar & Loader Indicator during Stripe manual capture */}
            <StripeProgressIndicator isLoading={submitting} type="confirm" />

            {/* Confirm handoff button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Capturing Funds via Stripe...</span>
                </div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm handoff</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* EXACT Trust Message from Spec, Reworded */}
            <div className="mt-5 pt-4 border-t border-slate-100 bg-blue-50/50 rounded-xl p-3.5 text-left border border-blue-100">
              <p className="text-xs text-blue-900 leading-relaxed font-medium">
                We will never ask you to read back a code sent to your phone by text message.
                This code only exists inside Handoff to confirm this trade.
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Cancel Trade Button for Seller before confirmation per Item 2 */}
      {!success && (trade.status === 'pending' || trade.status === 'paid') && (
        <div className="flex justify-center mb-4">
          <CancelTradeButton
            trade={trade}
            cancelledBy="seller"
            variant="outline"
            onCancelled={updated => {
              setTrade(updated);
              navigate(`/trade/${updated.id}/status`);
            }}
          />
        </div>
      )}

      {/* Helpful links */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <button
          onClick={() => navigate(`/trade/${trade.id}/status`)}
          className="text-blue-600 hover:underline font-medium"
        >
          View live status stepper
        </button>
        <button
          onClick={() => navigate(`/trade/${trade.id}/code`)}
          className="text-slate-400 hover:text-slate-600"
        >
          Buyer code screen →
        </button>
      </div>
    </div>
  );
};
