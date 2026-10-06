import React, { useState, useEffect } from 'react';
import { Seller } from '../types';
import { Users, Plus, ShieldCheck, CreditCard, ExternalLink, ArrowRight } from 'lucide-react';

interface SellersPageProps {
  navigate: (path: string) => void;
}

export const SellersPage: React.FC<SellersPageProps> = ({ navigate }) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sellers');
      if (res.ok) {
        const data = await res.json();
        setSellers(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setOnboardingUrl(null);
    try {
      const res = await fetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setName('');
        if (data.onboardingUrl) {
          setOnboardingUrl(data.onboardingUrl);
        }
        await loadSellers();
      }
    } catch (e) {
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-100">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Stripe Connect Express</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Registered Sellers
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Every seller has a connected Stripe Express account to receive automatic escrow payouts when in-person handoffs are confirmed.
        </p>
      </div>

      {/* Register New Seller Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Add New Seller Account</span>
        </h2>
        <form onSubmit={handleCreateSeller} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            required
            placeholder="Full Name (e.g. Jordan Lee)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs disabled:opacity-50"
          >
            {creating ? 'Connecting...' : 'Connect Stripe Account'}
          </button>
        </form>

        {onboardingUrl && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
            <span>Stripe Onboarding link ready for live payout credentials:</span>
            <a
              href={onboardingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 font-bold underline flex items-center gap-1"
            >
              <span>Complete Setup</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Sellers List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Active Sellers ({sellers.length})
        </h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading sellers...</div>
        ) : (
          sellers.map(s => (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm sm:text-base">
                    {s.displayName}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Stripe ID: <span className="text-slate-700">{s.stripeConnectAccountId}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
              >
                <span>Sell with this profile</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
