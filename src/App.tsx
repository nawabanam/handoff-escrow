import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CreateTradePage } from './pages/CreateTradePage';
import { PaymentPage } from './pages/PaymentPage';
import { HandoffCodePage } from './pages/HandoffCodePage';
import { ConfirmHandoffPage } from './pages/ConfirmHandoffPage';
import { StatusPage } from './pages/StatusPage';
import { AdminPage } from './pages/AdminPage';
import { SellersPage } from './pages/SellersPage';
import { LandingPage } from './pages/LandingPage';
import { testConnection } from './lib/firebase';
import { ShieldCheck, Lock, CheckCircle, Info } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  // Verify connection to Firestore on boot as required by Firebase skill
  useEffect(() => {
    testConnection().then(ok => {
      if (ok) {
        console.log('Connected to Firestore successfully.');
      }
    });
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  // Route matching
  const renderCurrentPage = () => {
    const path = currentPath;

    if (path === '/' || path === '' || path === '/landing') {
      return <LandingPage navigate={navigate} />;
    }
    if (path === '/app' || path === '/create') {
      return <CreateTradePage navigate={navigate} />;
    }
    if (path === '/sellers') {
      return <SellersPage navigate={navigate} />;
    }
    if (path === '/admin') {
      return <AdminPage navigate={navigate} />;
    }

    // Match /trade/:id/pay
    const payMatch = path.match(/^\/trade\/([^/]+)\/pay\/?$/);
    if (payMatch) {
      return <PaymentPage tradeId={payMatch[1]} navigate={navigate} />;
    }

    // Match /trade/:id/code
    const codeMatch = path.match(/^\/trade\/([^/]+)\/code\/?$/);
    if (codeMatch) {
      return <HandoffCodePage tradeId={codeMatch[1]} navigate={navigate} />;
    }

    // Match /trade/:id/confirm
    const confirmMatch = path.match(/^\/trade\/([^/]+)\/confirm\/?$/);
    if (confirmMatch) {
      return <ConfirmHandoffPage tradeId={confirmMatch[1]} navigate={navigate} />;
    }

    // Match /trade/:id/status
    const statusMatch = path.match(/^\/trade\/([^/]+)\/status\/?$/);
    if (statusMatch) {
      return <StatusPage tradeId={statusMatch[1]} navigate={navigate} />;
    }

    // Match general /trade/:id
    const tradeBaseMatch = path.match(/^\/trade\/([^/]+)\/?$/);
    if (tradeBaseMatch) {
      return <StatusPage tradeId={tradeBaseMatch[1]} navigate={navigate} />;
    }

    // Default fallback
    return <CreateTradePage navigate={navigate} />;
  };

  const isLanding = currentPath === '/' || currentPath === '' || currentPath === '/landing';

  // Landing page renders with its dedicated full-width header and footer (no double navbar)
  if (isLanding) {
    return <LandingPage navigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar currentPath={currentPath} navigate={navigate} />

      {/* Main Content Area */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Trust & Safety Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span>Handoff</span>
              <span className="text-slate-400 font-normal">| Safe In-Person Item Sales</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-blue-600" />
                Stripe Connect Manual Capture
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                No SMS Codes Needed
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <p>
              Always inspect and test items before sharing your 4-digit code. Meet in well-lit, public locations.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="hover:text-slate-700 underline"
              >
                Admin Review
              </button>
              <button
                onClick={() => navigate('/sellers')}
                className="hover:text-slate-700 underline"
              >
                Seller Hub
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
