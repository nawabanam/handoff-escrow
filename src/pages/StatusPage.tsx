import React, { useState, useEffect, useRef } from 'react';
import { Trade, calculatePlatformFee } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { HorizontalStepper } from '../components/HorizontalStepper';
import { StatusBadge } from '../components/StatusBadge';
import { CancelTradeButton } from '../components/CancelTradeButton';
import {
  ShieldCheck,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Share2,
  Check,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  XCircle,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

interface StatusPageProps {
  tradeId: string;
  navigate: (path: string) => void;
}

export const StatusPage: React.FC<StatusPageProps> = ({ tradeId, navigate }) => {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const tradeRef = useRef<Trade | null>(null);
  tradeRef.current = trade;

  useEffect(() => {
    async function fetchTradeData() {
      try {
        const res = await fetch(`/api/trades/${tradeId}`);
        if (!res.ok) throw new Error('Trade not found');
        const data: Trade = await res.json();
        setTrade(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTradeData();

    // 1. Live sync via Firestore onSnapshot
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

    // 2. Item 1: Auto-refresh active polling every 3.5 seconds while status is "pending" or "paid"
    const pollInterval = setInterval(async () => {
      const current = tradeRef.current;
      // Only poll while trade is still active (pending or paid)
      if (current && (current.status === 'pending' || current.status === 'paid')) {
        try {
          const res = await fetch(`/api/trades/${tradeId}`);
          if (res.ok) {
            const data: Trade = await res.json();
            // If status changed (e.g. cancelled by the other party), update immediately
            if (data.status !== current.status || data.cancelledAt !== current.cancelledAt) {
              setTrade(data);
            }
          }
        } catch (e) {
          // ignore transient poll error
        }
      }
    }, 3500);

    // Instant refresh when user returns to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTradeData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsub();
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tradeId]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {}
  };

  const handleSimulate24Hours = async () => {
    if (!trade) return;
    setSimulating(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}/simulate-24h`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.trade) {
        setTrade(data.trade);
      }
    } catch (err) {
      console.warn('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-medium">Tracking escrow status...</p>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
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

  const itemPrice = trade.price;
  const platformFee = trade.platformFee ?? calculatePlatformFee(itemPrice);
  const totalCharged = trade.totalAmount ?? Math.round((itemPrice + platformFee) * 100) / 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Trade ID: {trade.id}
            </span>
            <StatusBadge status={trade.status} size="sm" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {trade.itemName}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Cancel Trade Button if pending or paid */}
          {(trade.status === 'pending' || trade.status === 'paid') && (
            <CancelTradeButton
              trade={trade}
              variant="outline"
              onCancelled={updated => setTrade(updated)}
            />
          )}

          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs sm:text-sm font-medium rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Status</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stepper Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Trade Lifecycle
            </h2>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>Auto-refresh active</span>
          </div>
        </div>

        {/* Horizontal Stepper Component (or Cancelled/Refunded/Flagged end states) */}
        <HorizontalStepper trade={trade} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Financial Details with Platform Fee breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Escrow Breakdown</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Item Price (Seller Payout)</span>
              <span className="font-bold text-slate-900 text-sm">
                ${itemPrice.toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Handoff Protection Fee (Buyer)</span>
              <span className="font-semibold text-slate-700">
                ${platformFee.toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
              <span className="text-slate-700 font-bold">Total Buyer Charge</span>
              <span className="font-extrabold text-blue-700 text-base">
                ${totalCharged.toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>Payment Capture Mode</span>
              <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                manual (pre-auth)
              </span>
            </div>
          </div>
        </div>

        {/* Parties & Timestamps */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Parties & Timeline</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Seller</span>
              <span className="font-semibold text-slate-800">
                {trade.sellerDisplayName || 'Verified Seller'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Buyer</span>
              <span className="text-slate-700">{trade.buyerEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Initiated</span>
              <span className="text-slate-600">
                {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : 'Today'}
              </span>
            </div>
            {trade.paidAt && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Paid / Held At</span>
                <span className="text-slate-600">
                  {new Date(trade.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            {trade.confirmedAt && (
              <div className="flex justify-between items-center text-emerald-700 font-medium">
                <span>Released At</span>
                <span>
                  {new Date(trade.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            {trade.cancelledAt && (
              <div className="flex justify-between items-center text-rose-700 font-medium">
                <span>Cancelled By</span>
                <span className="capitalize">
                  {trade.cancelledBy || 'User'}
                  {trade.cancellationTimeFormatted ? ` at ${trade.cancellationTimeFormatted}` : ''}
                </span>
              </div>
            )}
            {trade.refundedAt && (
              <div className="flex justify-between items-center text-purple-700 font-medium">
                <span>Refunded At</span>
                <span>
                  {new Date(trade.refundedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Navigation Shortcuts */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Quick Access Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {trade.status === 'pending' && (
            <button
              onClick={() => navigate(`/trade/${trade.id}/pay`)}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Buyer: Pay Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {(trade.status === 'paid' || trade.status === 'confirmed' || trade.status === 'released') && (
            <button
              onClick={() => navigate(`/trade/${trade.id}/code`)}
              className="p-3 bg-white border border-slate-300 hover:border-blue-500 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>Buyer: View 4-Digit Code</span>
            </button>
          )}

          {trade.status === 'paid' && (
            <button
              onClick={() => navigate(`/trade/${trade.id}/confirm`)}
              className="p-3 bg-white border border-slate-300 hover:border-blue-500 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>Seller: Confirm Code</span>
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="p-3 bg-slate-200/70 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <span>+ Create New Trade</span>
          </button>
        </div>
      </div>

      {/* Testing helper tool to demonstrate 24-hour expiration */}
      {trade.status === 'paid' && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900">
          <div>
            <strong className="block font-semibold">Test 24h Expiration Rule</strong>
            <span className="text-[11px] text-amber-800">
              Simulate 24+ hours elapsed since payment hold to observe the "Flagged for review" screen.
            </span>
          </div>
          <button
            onClick={handleSimulate24Hours}
            disabled={simulating}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shrink-0 disabled:opacity-50"
          >
            {simulating ? 'Simulating...' : 'Simulate 24h+'}
          </button>
        </div>
      )}
    </div>
  );
};
