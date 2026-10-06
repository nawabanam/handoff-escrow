import React, { useState, useEffect } from 'react';
import { Seller, Trade, calculatePlatformFee } from '../types';
import {
  ShieldCheck,
  DollarSign,
  Mail,
  Package,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Info,
  CreditCard
} from 'lucide-react';

interface CreateTradePageProps {
  navigate: (path: string) => void;
}

export const CreateTradePage: React.FC<CreateTradePageProps> = ({ navigate }) => {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [newSellerName, setNewSellerName] = useState('');
  const [isCreatingSeller, setIsCreatingSeller] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrade, setCreatedTrade] = useState<Trade | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch sellers on load
  useEffect(() => {
    async function loadSellers() {
      try {
        const res = await fetch('/api/sellers');
        if (res.ok) {
          const data: Seller[] = await res.json();
          setSellers(data);
          if (data.length > 0) {
            setSelectedSellerId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not load sellers:', err);
      }
    }
    loadSellers();
  }, []);

  const handleCreateNewSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newSellerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create seller');

      setSellers(prev => [data.seller, ...prev]);
      setSelectedSellerId(data.seller.id);
      setIsCreatingSeller(false);
      setNewSellerName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numPrice = parseFloat(price);
    if (!itemName.trim()) {
      setError('Please provide an item name');
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please enter a valid sale price');
      return;
    }
    if (!buyerEmail.trim() || !buyerEmail.includes('@')) {
      setError('Please provide a valid buyer email address');
      return;
    }
    if (!selectedSellerId) {
      setError('Please select or register a seller profile with Stripe');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: selectedSellerId,
          buyerEmail: buyerEmail.trim(),
          itemName: itemName.trim(),
          price: numPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create trade');

      setCreatedTrade(data.trade);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tradeLink = createdTrade
    ? `${window.location.origin}/trade/${createdTrade.id}/pay`
    : '';

  const copyToClipboard = async () => {
    if (!tradeLink) return;
    try {
      await navigator.clipboard.writeText(tradeLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Preview fee calculations
  const parsedPrice = parseFloat(price);
  const validPrice = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0;
  const previewFee = validPrice > 0 ? calculatePlatformFee(validPrice) : 0;
  const previewTotal = validPrice > 0 ? Math.round((validPrice + previewFee) * 100) / 100 : 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Risk In-Person Selling</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create a Safe Local Trade
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto">
          Your buyer authorizes payment via Stripe. Funds are held in escrow and
          only released when you both confirm the in-person handoff.
        </p>
      </div>

      {/* Trade Created Confirmation Card */}
      {createdTrade ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm transition-all animate-in fade-in">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Trade Created!</h2>
            <p className="text-sm text-slate-600 mt-1">
              Send this link to the buyer before or at your meetup:
            </p>
          </div>

          {/* Trade Summary Box with Fee Breakdown */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Item</span>
              <span className="text-slate-900 font-semibold">{createdTrade.itemName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Your Payout (100% of price)</span>
              <span className="text-slate-900 font-bold">
                ${createdTrade.price.toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 text-xs">
              <span className="text-slate-500">Handoff Protection Fee (paid by buyer)</span>
              <span className="text-slate-700 font-medium">
                ${(createdTrade.platformFee ?? calculatePlatformFee(createdTrade.price)).toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-700 font-bold">Total Charged to Buyer</span>
              <span className="text-blue-700 font-extrabold text-base">
                ${(createdTrade.totalAmount ?? (createdTrade.price + calculatePlatformFee(createdTrade.price))).toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Copyable Link Field */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Buyer Payment Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={tradeLink}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all whitespace-nowrap shadow-xs ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={() => navigate(`/trade/${createdTrade.id}/pay`)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <span>Preview Buyer Payment Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate(`/trade/${createdTrade.id}/confirm`)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors border border-blue-200"
            >
              <span>Go to Seller Confirm Page (where you enter 4-digit code)</span>
            </button>

            <button
              onClick={() => navigate(`/trade/${createdTrade.id}/status`)}
              className="w-full py-2 px-4 rounded-xl text-slate-600 hover:text-slate-900 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Shared Status Tracker</span>
            </button>

            <button
              onClick={() => {
                setCreatedTrade(null);
                setItemName('');
                setPrice('');
                setBuyerEmail('');
              }}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              + Create another trade
            </button>
          </div>
        </div>
      ) : (
        /* Create Trade Form */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateTrade} className="space-y-5">
            {/* Seller profile selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Seller Profile (Payout Destination)
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingSeller(!isCreatingSeller)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {isCreatingSeller ? 'Choose existing' : '+ New Seller'}
                </button>
              </div>

              {isCreatingSeller ? (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 mb-2">
                  <span className="text-xs font-semibold text-blue-900 block">
                    Create New Seller Profile
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Alex Henderson"
                      value={newSellerName}
                      onChange={e => setNewSellerName(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-blue-600"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewSeller}
                      disabled={loading || !newSellerName.trim()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  <span className="text-[11px] text-blue-700 block">
                    Automatically provisions a connected Stripe Express destination ID.
                  </span>
                </div>
              ) : (
                <select
                  value={selectedSellerId}
                  onChange={e => setSelectedSellerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                >
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.displayName} ({s.stripeConnectAccountId})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Item Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Package className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony A7 III Camera + 28-70mm Lens"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Price with live fee preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sale Price (USD)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  required
                  placeholder="e.g. 850.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>

              {validPrice > 0 && (
                <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Seller payout (you receive):</span>
                    <strong className="text-slate-900 font-semibold">${validPrice.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Buyer protection fee (6%, $2 min):</span>
                    <span>+${previewFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-900 font-bold pt-1 border-t border-blue-200/50">
                    <span>Total buyer pays:</span>
                    <span>${previewTotal.toFixed(2)} USD</span>
                  </div>
                </div>
              )}
            </div>

            {/* Buyer Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Buyer Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="buyer@example.com"
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Used to verify receipt and send their secret handoff code.
              </p>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Generating Trade...</span>
                ) : (
                  <>
                    <span>Create Trade & Get Buyer Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Escrow Guarantee Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700">How payment works:</strong> The buyer pays the item price plus
              a 6% protection fee ($2 min). The seller always receives 100% of the item price. Funds are held safely
              until you meet and confirm the 4-digit handoff code.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
