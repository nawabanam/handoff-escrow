import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CancelTradeButton } from '../components/CancelTradeButton';
import { TradeQRCode } from '../components/TradeQRCode';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ExternalLink,
  Package,
  Eye,
  EyeOff,
  Sparkles,
  XCircle,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HandoffCodePageProps {
  tradeId: string;
  navigate: (path: string) => void;
}

export const HandoffCodePage: React.FC<HandoffCodePageProps> = ({ tradeId, navigate }) => {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [obscured, setObscured] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    async function loadTrade() {
      try {
        const res = await fetch(`/api/trades/${tradeId}`);
        if (!res.ok) throw new Error('Trade not found');
        const data: Trade = await res.json();
        setTrade(data);
        setIsOffline(false);

        // Cache code and trade details in device storage for underground/poor signal offline viewing
        if (data.handoffCode) {
          try {
            localStorage.setItem(`handoff_code_cache_${tradeId}`, JSON.stringify(data));
          } catch (e) {}
        }

        // If unpaid, prompt buyer to pay first
        if (data.status === 'pending') {
          navigate(`/trade/${tradeId}/pay`);
          return;
        }
      } catch (err: any) {
        // Attempt offline fallback from local device storage
        try {
          const cachedStr = localStorage.getItem(`handoff_code_cache_${tradeId}`);
          if (cachedStr) {
            const cachedData = JSON.parse(cachedStr) as Trade;
            setTrade(cachedData);
            setIsOffline(true);
            return;
          }
        } catch (e) {}
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTrade();

    // Attach real-time snapshot listener on Firestore document
    const unsub = onSnapshot(
      doc(db, 'trades', tradeId),
      docSnap => {
        if (docSnap.exists()) {
          const updated = { id: docSnap.id, ...docSnap.data() } as Trade;
          setTrade(prev => {
            // Trigger confetti if transition to released
            if (prev?.status !== 'released' && updated.status === 'released') {
              try {
                confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.6 },
                });
              } catch (e) {}
            }
            return updated;
          });
        }
      },
      err => {
        handleFirestoreError(err, OperationType.GET, `trades/${tradeId}`);
      }
    );

    return () => unsub();
  }, [tradeId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-medium">Retrieving handoff code...</p>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Trade Error</h2>
        <p className="text-sm text-slate-600 mb-4">{error || 'Trade not found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // If trade was cancelled, show confirmation message per Item 2
  if (trade.status === 'cancelled') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center animate-in fade-in">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Trade Cancelled</h2>
          <p className="text-sm font-medium text-slate-700 max-w-xs mx-auto mb-6">
            {trade.cancellationMessage || 'This trade was cancelled. The hold on your payment has been released'}
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

  // If trade was refunded by platform, show message per Item 3
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

  const isReleased = trade.status === 'released';

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      {/* Top Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Payment Securely Held</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {isReleased ? 'Handoff Complete!' : 'Your Handoff Code'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          {isReleased
            ? 'The seller verified the code. Funds have been released.'
            : 'Keep this screen ready when meeting the seller.'}
        </p>
      </div>

      {/* Main Code Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center relative overflow-hidden mb-6">
        {/* Release Success Overlay */}
        {isReleased ? (
          <div className="py-6 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Exchange Confirmed!</h2>
            <p className="text-sm text-slate-600 max-w-xs mx-auto mb-4">
              You verified the item, and the seller received their payout of{' '}
              <strong className="text-blue-700 font-semibold">${trade.price.toFixed(2)}</strong>.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono">
              Finalized: {trade.confirmedAt ? new Date(trade.confirmedAt).toLocaleTimeString() : 'Just now'}
            </div>
          </div>
        ) : (
          <div>
            {/* Required Label */}
            {isOffline && (
              <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Offline Mode (Cached on this device)</span>
              </div>
            )}

            <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-4">
              Show this to the seller once you have the item.
            </p>

            {/* 4-Digit Code Display */}
            <div className="relative py-4 my-2">
              <div className="flex justify-center items-center gap-2 sm:gap-3">
                {trade.handoffCode?.split('').map((digit, idx) => (
                  <div
                    key={idx}
                    className="w-14 sm:w-16 h-20 sm:h-22 rounded-2xl bg-slate-50 border-2 border-blue-600 flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-blue-900 tracking-tight font-mono shadow-inner"
                  >
                    {obscured ? '•' : digit}
                  </div>
                ))}
              </div>

              {/* Hide/Show Toggle */}
              <button
                type="button"
                onClick={() => setObscured(!obscured)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                {obscured ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal digits</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide digits until meetup</span>
                  </>
                )}
              </button>
            </div>

            {/* EXACT Trust Message from Spec */}
            <div className="mt-6 pt-5 border-t border-slate-100 bg-amber-50/60 rounded-xl p-4 text-left border border-amber-200/80">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  This is not a verification code sent to your phone. It only confirms this specific trade
                  inside Handoff — never share it before you physically have the item.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trade Summary Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2 mb-6 shadow-xs">
        <div className="flex justify-between items-center text-slate-500">
          <span>Item</span>
          <span className="font-semibold text-slate-900">{trade.itemName}</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>Item Price</span>
          <span className="font-semibold text-slate-800">${trade.price.toFixed(2)}</span>
        </div>
        {trade.platformFee !== undefined && (
          <div className="flex justify-between items-center text-slate-500">
            <span>Handoff Protection Fee</span>
            <span className="text-slate-700">${trade.platformFee.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100 font-bold">
          <span className="text-slate-700">Total Authorized</span>
          <span className="text-blue-700">${(trade.totalAmount || trade.price).toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>Seller</span>
          <span className="font-medium text-slate-800">{trade.sellerDisplayName || 'Verified Seller'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/trade/${trade.id}/status`)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Status Stepper</span>
          </button>

          <TradeQRCode trade={trade} compact={true} />
        </div>

        {/* Cancel Trade Button (post-payment, pre-confirmation) per Item 2 */}
        {trade.status === 'paid' && (
          <div className="flex justify-center pt-2">
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
        )}

        {/* Quick link for testing */}
        <button
          onClick={() => navigate(`/trade/${trade.id}/confirm`)}
          className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors block text-center"
        >
          Switch to Seller Confirm Screen →
        </button>
      </div>
    </div>
  );
};
