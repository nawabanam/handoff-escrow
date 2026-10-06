import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export interface ProgressStage {
  title: string;
  threshold: number; // percentage threshold when this stage activates
}

interface StripeProgressIndicatorProps {
  isLoading: boolean;
  type: 'pay' | 'confirm';
  amount?: number;
}

export const StripeProgressIndicator: React.FC<StripeProgressIndicatorProps> = ({
  isLoading,
  type,
  amount,
}) => {
  const [progress, setProgress] = useState(0);

  const payStages: ProgressStage[] = [
    { title: 'Securing card credentials', threshold: 10 },
    { title: 'Authorizing Stripe escrow hold', threshold: 45 },
    { title: 'Generating secret 4-digit code', threshold: 80 },
    { title: 'Escrow hold secured!', threshold: 98 },
  ];

  const confirmStages: ProgressStage[] = [
    { title: 'Verifying 4-digit handoff code', threshold: 10 },
    { title: 'Capturing Stripe PaymentIntent', threshold: 45 },
    { title: 'Transferring payout to seller', threshold: 80 },
    { title: 'Handoff confirmed & funds released!', threshold: 98 },
  ];

  const stages = type === 'pay' ? payStages : confirmStages;

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    // Realistic stepped progress simulation while the real Stripe API executes
    setProgress(12);

    const t1 = setTimeout(() => setProgress(38), 350);
    const t2 = setTimeout(() => setProgress(64), 850);
    const t3 = setTimeout(() => setProgress(88), 1600);
    const t4 = setTimeout(() => setProgress(96), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  // Determine active stage
  let activeStageIndex = 0;
  for (let i = 0; i < stages.length; i++) {
    if (progress >= stages[i].threshold) {
      activeStageIndex = i;
    }
  }

  const currentStage = stages[activeStageIndex];

  return (
    <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 my-3 text-left shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center animate-pulse">
            <Lock className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold text-blue-950">
            {type === 'pay'
              ? amount
                ? `Authorizing $${amount.toFixed(2)} Escrow Hold...`
                : 'Authorizing Escrow Hold...'
              : 'Verifying Code & Capturing Funds...'}
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-blue-700">
          {Math.min(progress, 99)}%
        </span>
      </div>

      {/* Main Animated Progress Bar */}
      <div className="w-full bg-blue-200/60 h-2.5 rounded-full overflow-hidden relative mb-3">
        <div
          className="bg-linear-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-white/30 skew-x-12 animate-pulse" />
        </div>
      </div>

      {/* Active Stage Indicator */}
      <div className="flex items-center justify-between text-[11px] text-blue-900 bg-white/90 px-3 py-2 rounded-xl border border-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="font-semibold text-slate-800">
            {currentStage.title}
          </span>
        </div>
        <span className="text-[10px] text-blue-600 font-medium font-mono">
          Step {activeStageIndex + 1} of {stages.length}
        </span>
      </div>
    </div>
  );
};
