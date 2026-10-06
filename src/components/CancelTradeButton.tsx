import React, { useState } from 'react';
import { Trade } from '../types';
import { XCircle, AlertTriangle, ShieldCheck, User } from 'lucide-react';

interface CancelTradeButtonProps {
  trade: Trade;
  cancelledBy?: 'buyer' | 'seller';
  onCancelled?: (updatedTrade: Trade) => void;
  className?: string;
  variant?: 'outline' | 'danger' | 'ghost';
}

export const CancelTradeButton: React.FC<CancelTradeButtonProps> = ({
  trade,
  cancelledBy: initialCancelledBy,
  onCancelled,
  className = '',
  variant = 'outline',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>(
    initialCancelledBy || 'buyer'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available only when trade status is "pending" or "paid" (before confirmed or released)
  if (trade.status !== 'pending' && trade.status !== 'paid') {
    return null;
  }

  const isPostPayment = trade.status === 'paid';
  const effectiveRole = initialCancelledBy || selectedRole;

  const handleConfirmCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trades/${trade.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledBy: effectiveRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel trade');
      }

      setIsOpen(false);
      if (onCancelled) {
        onCancelled(data.trade);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle =
    variant === 'danger'
      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
      : variant === 'ghost'
      ? 'text-slate-400 hover:text-rose-600'
      : 'bg-white text-slate-600 hover:text-rose-600 hover:border-rose-300 border border-slate-200';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${buttonStyle} ${className}`}
      >
        <XCircle className="w-3.5 h-3.5" />
        <span>Cancel Trade</span>
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Cancel this trade?
            </h3>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {isPostPayment
                ? 'The payment hold will be immediately released back to the buyer via Stripe with zero fees or charges.'
                : 'This trade will be cancelled immediately. No funds will be charged.'}
            </p>

            {/* If role is not strictly predefined, allow user to specify */}
            {!initialCancelledBy && (
              <div className="mb-4 text-left">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  I am cancelling as:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('buyer')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                      selectedRole === 'buyer'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Buyer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('seller')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                      selectedRole === 'seller'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Seller</span>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-left">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Keep Trade
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={loading}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
