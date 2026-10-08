import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
  MapPin,
  ExternalLink,
  Smartphone,
  CreditCard,
  Building2,
  RefreshCw,
  Mail,
  Zap,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div id="top" className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* 1. Header & Navigation (Zero Watermarks) */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 group">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-lg text-slate-950 font-mono leading-none">
                handoff
              </span>
              <span className="text-[10px] text-slate-600 font-medium tracking-wider uppercase">
                Safe Swap Spot
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#how" className="hover:text-blue-600 transition-colors">
              How it works
            </a>
            <a href="#why" className="hover:text-blue-600 transition-colors">
              Why Handoff
            </a>
            <a href="#demo" className="hover:text-blue-600 transition-colors">
              Live Demo
            </a>
            <a href="#signup" className="hover:text-blue-600 transition-colors">
              Join waitlist
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span>Test Live Escrow</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <a
              href="#signup"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              Join waitlist
            </a>
          </div>
        </div>
      </header>

      <main className="pt-24 sm:pt-28">
        {/* 2. Hero Section */}
        <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Headline & Waitlist */}
            <div className="lg:col-span-7 space-y-6">
              {/* Pulsing Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-900 shadow-2xs">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-blue-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-blue-600" />
                </span>
                <span>Local escrow for in-person trades</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-extrabold tracking-tight text-slate-950 text-4xl sm:text-6xl lg:text-7xl leading-[1.02]">
                Security for the <span className="text-blue-600 underline decoration-blue-200 decoration-wavy underline-offset-8">handoff</span>.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Meet a stranger from Marketplace. Buy a used bike. Hire a local handyman. Handoff holds the money safely until the deal is done — so no one carries cash to a stranger, and it works even when you don't share the same payment app.
              </p>

              {/* Waitlist Form Component (Hero) */}
              <div className="pt-2 max-w-md">
                <WaitlistForm source="hero" />
              </div>

              {/* Value Checks */}
              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>No cash needed</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Any bank or app</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Funds released on tap</span>
                </span>
              </div>
            </div>

            {/* Right Column: Hero Transaction Preview Card */}
            <div className="lg:col-span-5 relative">
              {/* Background Glow */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-emerald-500/10 rounded-3xl blur-xl" />

              {/* Main Card Graphic */}
              <div className="relative rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 sm:p-7 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      TX · HD-4821
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span className="text-xs text-slate-400">Downtown Safe Spot</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Funds secured</span>
                  </span>
                </div>

                {/* Item Details */}
                <div className="my-6 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Item for trade</span>
                    <h4 className="text-lg font-bold text-white mt-0.5">Vintage SLR Camera & Lens</h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>Meetup: Public Coffee Shop (1.2 mi away)</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Agreed Price</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono mt-0.5">
                      $240.00
                    </div>
                  </div>
                </div>

                {/* Stepper Visualizer */}
                <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60">
                  <div className="text-[11px] font-semibold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                    <span>Escrow Verification State</span>
                    <span className="text-blue-400 font-mono">Step 2 of 3</span>
                  </div>

                  <div className="flex items-center justify-between relative">
                    {/* Connecting line */}
                    <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-slate-700 -z-0">
                      <div className="w-1/2 h-full bg-blue-500 transition-all" />
                    </div>

                    {/* Step 1: Lock */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-blue-600/50">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-300">Lock</span>
                    </div>

                    {/* Step 2: Meet */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className="w-7 h-7 rounded-full bg-blue-500 text-white border-2 border-blue-400 flex items-center justify-center text-xs font-bold animate-pulse">
                        2
                      </div>
                      <span className="text-[11px] font-bold text-blue-400">Meet & Inspect</span>
                    </div>

                    {/* Step 3: Release */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-600 text-slate-400 flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">Release</span>
                    </div>
                  </div>
                </div>

                {/* Footer note */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Card pre-authorized on Stripe</span>
                  </span>
                  <span className="text-slate-400 font-mono">4-digit code generated</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section: "THE MECHANISM OF EXCHANGE" (How It Works) */}
        <section id="how" className="py-20 md:py-28 border-t border-slate-200 bg-slate-50/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-bold text-blue-600 tracking-wider uppercase">
                THE MECHANISM OF EXCHANGE
              </p>
              <h2 className="mt-2.5 font-extrabold tracking-tight text-slate-950 text-3xl sm:text-5xl">
                Three steps. Zero cash. Total trust.
              </h2>
              <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                Handoff works for any local deal — selling a couch, hiring a cleaner, picking up a used phone.
              </p>
            </div>

            <ol className="mt-12 grid md:grid-cols-3 gap-6 lg:gap-8 list-none p-0">
              {/* Step 1 */}
              <li className="group relative rounded-3xl border border-slate-200 bg-white p-7 transition-all hover:border-blue-500 hover:shadow-md">
                <span className="font-mono text-xs font-bold text-slate-400">
                  01
                </span>
                <div className="mt-5 grid place-items-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                  <Lock className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="mt-5 font-bold text-xl text-slate-900">
                  Lock
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  One of you opens a Handoff link and secures the funds. No cash changes hands — the money is held safely in escrow until the deal is inspected.
                </p>
              </li>

              {/* Step 2 */}
              <li className="group relative rounded-3xl border border-slate-200 bg-white p-7 transition-all hover:border-blue-500 hover:shadow-md">
                <span className="font-mono text-xs font-bold text-slate-400">
                  02
                </span>
                <div className="mt-5 grid place-items-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                  <MapPin className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="mt-5 font-bold text-xl text-slate-900">
                  Meet
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  You meet in person, check the item or finish the job. Both sides already know the payment is 100% pre-authorized and guaranteed.
                </p>
              </li>

              {/* Step 3 */}
              <li className="group relative rounded-3xl border border-slate-200 bg-white p-7 transition-all hover:border-blue-500 hover:shadow-md">
                <span className="font-mono text-xs font-bold text-slate-400">
                  03
                </span>
                <div className="mt-5 grid place-items-center w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="mt-5 font-bold text-xl text-slate-900">
                  Release
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  The buyer shares their secret 4-digit code. The seller confirms it and receives payout instantly to their bank or card. No chasing, no IOUs, no risk.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* 4. Section: "THE PLATFORM BRIDGE" (Universal Payment Adapter) */}
        <section id="why" className="py-20 md:py-28 border-t border-slate-200 bg-white overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-bold text-blue-600 tracking-wider uppercase">
                THE PLATFORM BRIDGE
              </p>
              <h2 className="mt-2.5 font-extrabold tracking-tight text-slate-950 text-3xl sm:text-5xl">
                Different apps? Same problem. One bridge.
              </h2>
              <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                You use Cash App, they only take Zelle. You pay with Apple Pay, they want a bank transfer. Handoff is the universal adapter — the money lands wherever it needs to, without anyone switching apps.
              </p>
            </div>

            {/* Visual Centerpiece */}
            <div className="relative mt-14">
              <div className="flex items-center justify-center gap-4">
                <div className="hidden sm:block flex-1 max-w-sm h-px bg-gradient-to-l from-blue-500/50 to-transparent" />
                <div className="grid place-items-center w-20 h-20 rounded-2xl border-2 border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-600/30 shrink-0">
                  <ShieldCheck className="w-10 h-10 stroke-[2.5]" />
                </div>
                <div className="hidden sm:block flex-1 max-w-sm h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
              </div>

              {/* Marquee Tags */}
              <div className="mt-8 space-y-3">
                {/* Row 1 */}
                <div className="flex flex-wrap justify-center gap-3">
                  {['Cash App', 'Venmo', 'Zelle', 'Apple Pay', 'Bank Transfer', 'PayPal', 'Google Pay', 'Chime'].map(app => (
                    <span
                      key={app}
                      className="rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-colors shadow-2xs"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Live App Demo Launcher */}
        <section id="demo" className="py-16 border-t border-slate-200 bg-gradient-to-b from-blue-50/50 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-blue-200/80 rounded-3xl p-8 sm:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Interactive Prototype</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Experience the full escrow engine now
                </h3>
                <p className="text-sm text-slate-600 max-w-xl">
                  Try creating a test trade, authorizing a card hold, viewing the buyer's 4-digit code, and testing seller confirmation in real time.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/app')}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Launch Live Escrow Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/sellers')}
                  className="px-5 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Seller Setup</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Section: "JOIN THE WAITLIST" (High-Converting Bottom CTA) */}
        <section id="signup" className="relative bg-slate-950 text-white py-20 md:py-28 overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center space-y-5">
            <p className="font-mono text-xs font-bold text-blue-400 tracking-wider uppercase">
              JOIN THE WAITLIST
            </p>
            <h2 className="font-extrabold tracking-tight text-white text-3xl sm:text-5xl lg:text-6xl">
              Be first to trade without cash.
            </h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
              We're building Handoff for people who do local deals with strangers. Drop your email — we'll let you know the moment it's live in your city.
            </p>

            <div className="pt-4 mx-auto max-w-md text-left">
              <WaitlistForm source="cta" variant="dark" />
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer (Zero Watermarks) */}
      <footer className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-blue-600 text-white shadow-xs">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <p className="font-extrabold tracking-tight text-slate-900 font-mono">handoff</p>
                <p className="text-xs text-slate-600">Security for the handoff.</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-slate-600">
              <a href="#how" className="hover:text-blue-600 transition-colors">
                How it works
              </a>
              <a href="#why" className="hover:text-blue-600 transition-colors">
                Why handoff
              </a>
              <a href="#signup" className="hover:text-blue-600 transition-colors">
                Join waitlist
              </a>
              <button
                onClick={() => navigate('/admin')}
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                Admin & Waitlist Leads
              </button>
              <a href="mailto:hello@handoff.app" className="hover:text-blue-600 transition-colors">
                Contact
              </a>
            </nav>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <p>© {new Date().getFullYear()} Handoff. All rights reserved.</p>
            <p>Made for local traders, buyers & sellers. Zero watermark.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Reusable Waitlist Form Component
interface WaitlistFormProps {
  source: 'hero' | 'cta';
  variant?: 'light' | 'dark';
}

const WaitlistForm: React.FC<WaitlistFormProps> = ({ source, variant = 'light' }) => {
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();

    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setMessage('Enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, source, city: city.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setMessage(data.message || "You're on the list!");
      setStatus('success');
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const isDark = variant === 'dark';

  if (status === 'success') {
    return (
      <div
        className={`w-full rounded-2xl border p-5 ${
          isDark
            ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-900'
        } animate-in fade-in`}
      >
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-8 h-8 rounded-full bg-emerald-600 text-white shrink-0 shadow-xs">
            <Check className="w-5 h-5 stroke-[3]" />
          </span>
          <div>
            <p className="font-bold text-sm">{message}</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-700'}`}>
              We'll notify you as soon as Handoff launches in your area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      <div
        className={`flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl border-2 transition-all ${
          isDark
            ? 'border-slate-800 bg-slate-900 focus-within:border-blue-500'
            : 'border-slate-200 bg-white focus-within:border-blue-600 shadow-xs'
        }`}
      >
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          disabled={status === 'loading'}
          className={`flex-1 bg-transparent px-3.5 py-3 text-sm sm:text-base outline-none ${
            isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
          }`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-5 py-3 font-bold text-xs sm:text-sm text-white transition-all shadow-md shadow-blue-600/25 disabled:opacity-60 cursor-pointer"
        >
          {status === 'loading' ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Join waitlist</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-xs font-semibold text-rose-500 px-1 animate-in fade-in">
          {message}
        </p>
      )}

      <p className={`text-[11px] px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        No spam. One email when we launch. Unsubscribe anytime.
      </p>
    </form>
  );
};
