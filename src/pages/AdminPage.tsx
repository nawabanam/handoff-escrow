import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  DollarSign,
  ShieldCheck,
  Package,
  Calendar,
  CreditCard,
  User,
  X,
  RotateCcw
} from 'lucide-react';

interface AdminPageProps {
  navigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ navigate }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'paid' | 'released' | 'refunded' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Check saved session
  useEffect(() => {
    const saved = sessionStorage.getItem('handoff_admin_pwd');
    if (saved) {
      setPassword(saved);
      verifyAndLoad(saved);
    }
  }, []);

  const verifyAndLoad = async (pwd: string) => {
    setLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/trades', {
        headers: {
          Authorization: `Bearer ${pwd}`,
        },
      });

      if (!res.ok) {
        throw new Error('Incorrect admin password');
      }

      const data: Trade[] = await res.json();
      setTrades(data);
      setIsAuthenticated(true);
      sessionStorage.setItem('handoff_admin_pwd', pwd);
    } catch (err: any) {
      setLoginError(err.message);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    verifyAndLoad(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('handoff_admin_pwd');
    setIsAuthenticated(false);
    setPassword('');
    setTrades([]);
    setSelectedTrade(null);
  };

  const handleAction = async (action: 'release' | 'refund' | 'reviewed') => {
    if (!selectedTrade) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/trades/${selectedTrade.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      // Update local state
      setTrades(prev => prev.map(t => (t.id === selectedTrade.id ? data.trade : t)));
      setSelectedTrade(data.trade);

      const msgs = {
        release: 'Funds captured and released to seller!',
        refund:
          selectedTrade.status === 'released'
            ? 'Stripe refund initiated! Trade marked as refunded by platform.'
            : 'Payment hold canceled. Buyer refunded!',
        reviewed: 'Trade marked as reviewed by administrator.',
      };
      setActionMessage(msgs[action]);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered trades
  const filteredTrades = trades.filter(t => {
    if (filter === 'flagged' && t.status !== 'flagged') return false;
    if (filter === 'paid' && t.status !== 'paid') return false;
    if (filter === 'released' && t.status !== 'released') return false;
    if (filter === 'refunded' && t.status !== 'refunded') return false;
    if (filter === 'cancelled' && t.status !== 'cancelled') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.itemName.toLowerCase().includes(q) ||
        t.buyerEmail.toLowerCase().includes(q) ||
        (t.sellerDisplayName && t.sellerDisplayName.toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const flaggedCount = trades.filter(t => t.status === 'flagged').length;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-center">
          <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <Lock className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-1">Admin Console</h1>
          <p className="text-xs text-slate-500 mb-6">
            Enter the admin password defined in your environment variables to review trades.
          </p>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-left">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none text-center"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Access Dashboard'}</span>
            </button>
          </form>

          <p className="mt-4 text-[11px] text-slate-400">
            Configurable via <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">ADMIN_PASSWORD</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Trades & Escrow Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage transactions, review holds over 24 hours, and execute manual captures, cancellations, or post-release refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => verifyAndLoad(password)}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Filter Tabs */}
        <div className="flex items-center flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600 gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            All ({trades.length})
          </button>
          <button
            onClick={() => setFilter('flagged')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              filter === 'flagged' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            <span>Flagged</span>
            {flaggedCount > 0 && (
              <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {flaggedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'paid' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            In Escrow ({trades.filter(t => t.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilter('released')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'released' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Released ({trades.filter(t => t.status === 'released').length})
          </button>
          <button
            onClick={() => setFilter('refunded')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'refunded' ? 'bg-white text-purple-700 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Refunded ({trades.filter(t => t.status === 'refunded').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'cancelled' ? 'bg-white text-slate-700 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Cancelled ({trades.filter(t => t.status === 'cancelled').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, emails, IDs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-blue-600"
          />
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Buyer Email</th>
                <th className="py-3 px-4">Seller Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No trades match the current filter.
                  </td>
                </tr>
              ) : (
                filteredTrades.map(trade => {
                  const isFlagged = trade.status === 'flagged';

                  return (
                    <tr
                      key={trade.id}
                      onClick={() => setSelectedTrade(trade)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isFlagged ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[180px] truncate">
                        {trade.itemName}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-700">
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate">
                        {trade.buyerEmail}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {trade.sellerDisplayName || 'Seller'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={trade.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedTrade(trade);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedTrade.status} size="sm" />
                <span className="font-mono text-xs text-slate-400">
                  {selectedTrade.id}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedTrade(null);
                  setActionMessage(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Feedback */}
            {actionMessage && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs font-medium ${
                  actionMessage.startsWith('Error')
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {actionMessage}
              </div>
            )}

            {/* Trade Info */}
            <div className="py-4 space-y-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Item Name
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedTrade.itemName}</h3>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Item Price</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    ${selectedTrade.price.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Protection Fee</span>
                  <span className="text-sm font-semibold text-blue-700">
                    ${(selectedTrade.platformFee ?? 2.0).toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Charged</span>
                  <span className="text-sm font-extrabold text-blue-800">
                    ${(selectedTrade.totalAmount ?? selectedTrade.price + 2.0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Buyer:</span>
                  <span className="font-medium text-slate-800">{selectedTrade.buyerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Seller:</span>
                  <span className="font-medium text-slate-800">
                    {selectedTrade.sellerDisplayName || 'Seller'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Seller Stripe Account:</span>
                  <span className="font-mono text-slate-700 truncate max-w-[150px]">
                    {selectedTrade.sellerStripeAccountId || 'acct_express'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stripe PaymentIntent:</span>
                  <span className="font-mono text-slate-700 truncate max-w-[150px]">
                    {selectedTrade.stripePaymentIntentId || 'None'}
                  </span>
                </div>
                {selectedTrade.handoffCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Handoff Code:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedTrade.handoffCode}
                    </span>
                  </div>
                )}
                {selectedTrade.flaggedReason && (
                  <div className="pt-2 text-rose-700 border-t border-slate-200">
                    <strong>Flagged reason:</strong> {selectedTrade.flaggedReason}
                  </div>
                )}
                {selectedTrade.cancellationMessage && (
                  <div className="pt-2 text-slate-700 border-t border-slate-200">
                    <strong>Cancellation info:</strong> {selectedTrade.cancellationMessage}
                  </div>
                )}
                {selectedTrade.refundReason && (
                  <div className="pt-2 text-purple-700 border-t border-slate-200">
                    <strong>Refund info:</strong> {selectedTrade.refundReason}
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS:
                - Flagged trades: "Release funds", "Refund buyer" (cancel hold), "Mark reviewed"
                - Released trades (Item 3): "Refund" button (calls stripe.refunds.create() for full captured amount)
            */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {/* For Released trades: Item 3 Refund button */}
              {selectedTrade.status === 'released' && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
                    This trade was confirmed and released. You can issue a full refund to the buyer via Stripe.
                  </div>
                  <button
                    onClick={() => handleAction('refund')}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Refund (Full Captured Amount)</span>
                  </button>
                </div>
              )}

              {/* For Flagged or Paid trades: Release funds & Refund / Cancel hold */}
              {selectedTrade.status !== 'released' && selectedTrade.status !== 'refunded' && selectedTrade.status !== 'cancelled' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction('release')}
                    disabled={actionLoading || selectedTrade.status !== 'paid' && selectedTrade.status !== 'flagged'}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Release funds</span>
                  </button>

                  <button
                    onClick={() => handleAction('refund')}
                    disabled={actionLoading}
                    className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Refund buyer</span>
                  </button>
                </div>
              )}

              {/* Mark Reviewed */}
              {selectedTrade.status !== 'refunded' && selectedTrade.status !== 'cancelled' && (
                <button
                  onClick={() => handleAction('reviewed')}
                  disabled={actionLoading || selectedTrade.isReviewed}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{selectedTrade.isReviewed ? 'Already Reviewed' : 'Mark reviewed'}</span>
                </button>
              )}

              <button
                onClick={() => navigate(`/trade/${selectedTrade.id}/status`)}
                className="w-full py-1.5 text-center text-xs text-blue-600 hover:underline"
              >
                View public status page →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
