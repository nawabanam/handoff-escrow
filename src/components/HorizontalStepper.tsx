import React from 'react';
import { Trade } from '../types';
import { Check, AlertTriangle, ShieldAlert, XCircle, RotateCcw } from 'lucide-react';

interface HorizontalStepperProps {
  trade: Trade;
}

export const HorizontalStepper: React.FC<HorizontalStepperProps> = ({ trade }) => {
  // Check Cancelled end state with explicit "who cancelled and when" per Item 2
  if (trade.status === 'cancelled') {
    const isPostPayment = Boolean(trade.paidAt);
    const roleText = trade.cancelledBy || 'other party';
    const timeText = trade.cancellationTimeFormatted
      ? ` at ${trade.cancellationTimeFormatted}`
      : trade.cancelledAt
      ? ` at ${new Date(trade.cancelledAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })}`
      : '';

    const whoAndWhen = `This trade was cancelled by the ${roleText}${timeText}.`;
    const paymentMsg = isPostPayment
      ? 'The hold on your payment has been released'
      : 'No money was charged';

    return (
      <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 sm:p-8 text-center my-4 animate-in fade-in">
        <div className="w-14 h-14 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Trade Cancelled</h3>
        <p className="text-sm sm:text-base font-bold text-slate-900 max-w-md mx-auto mb-2">
          {whoAndWhen}
        </p>
        <p className="text-xs font-medium text-slate-600 max-w-md mx-auto leading-relaxed mb-4">
          {paymentMsg}
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs">
          <span>
            {isPostPayment
              ? 'Stripe hold canceled • Zero charges to buyer'
              : 'Closed before payment authorization'}
          </span>
        </div>
      </div>
    );
  }

  // Check Refunded end state
  if (trade.status === 'refunded') {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 sm:p-8 text-center my-4 animate-in fade-in">
        <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-200">
          <RotateCcw className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-purple-950 mb-2">Trade Refunded</h3>
        <p className="text-sm font-medium text-purple-850 max-w-md mx-auto leading-relaxed mb-4">
          {trade.refundReason || 'This trade was refunded by the platform.'}
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-purple-800 bg-white/90 px-3.5 py-1.5 rounded-full border border-purple-200 shadow-2xs">
          <span>Full amount refunded via original payment method</span>
        </div>
      </div>
    );
  }

  // Check 24-hour expiration on paid trade
  let isOverdue = false;
  if (trade.status === 'paid' && trade.paidAt && !trade.confirmedAt) {
    const paidMs = new Date(trade.paidAt).getTime();
    const nowMs = Date.now();
    const hours = (nowMs - paidMs) / (1000 * 60 * 60);
    if (hours > 24) {
      isOverdue = true;
    }
  }

  // If status is flagged or overdue >24h with no confirmation, show "Flagged for review" instead of the stepper
  if (trade.status === 'flagged' || isOverdue) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center my-4 animate-in fade-in">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-rose-950 mb-2">Flagged for Review</h3>
        <p className="text-sm text-rose-800 max-w-md mx-auto leading-relaxed mb-4">
          {trade.flaggedReason ||
            'More than 24 hours have elapsed since payment hold was placed with no confirmed handoff. Funds remain securely paused while under administrator review.'}
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-rose-700 bg-white/80 px-3 py-1.5 rounded-full border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Manual Hold Active (Stripe pre-authorization retained)</span>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'created', label: 'Created', desc: 'Trade initiated' },
    { id: 'paid', label: 'Paid', desc: 'Escrow hold authorized' },
    { id: 'code_sent', label: 'Code sent', desc: 'Generated for buyer' },
    { id: 'confirmed', label: 'Confirmed', desc: 'Seller verified code' },
    { id: 'released', label: 'Released', desc: 'Payout transferred' },
  ];

  let activeIndex = 0;
  if (trade.status === 'pending') {
    activeIndex = 0;
  } else if (trade.status === 'paid') {
    activeIndex = 2; // Paid is complete, code has been sent/is active
  } else if (trade.status === 'confirmed') {
    activeIndex = 3;
  } else if (trade.status === 'released') {
    activeIndex = 4;
  }

  return (
    <div className="w-full py-4 my-2">
      {/* Mobile view: Stacked / Compact */}
      <div className="sm:hidden space-y-3">
        {steps.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                  : isDone
                  ? 'bg-slate-50/80 border-slate-200 text-slate-700'
                  : 'bg-white border-slate-100 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm font-semibold ${
                    isCurrent ? 'text-blue-900' : isDone ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-xs text-slate-500">{step.desc}</div>
              </div>
              {isCurrent && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                  Current
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet view: Horizontal Stepper */}
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute left-6 top-5 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-500 -z-0"
            style={{
              width: `${(activeIndex / (steps.length - 1)) * 100}%`,
            }}
          />

          {steps.map((step, idx) => {
            const isDone = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center group">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isDone
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-600/30 scale-105'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-5 h-5 stroke-[2.5]" /> : idx + 1}
                </div>
                <span
                  className={`mt-2.5 text-xs font-semibold tracking-tight transition-colors ${
                    isCurrent ? 'text-blue-700' : isDone ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[11px] text-slate-400 max-w-[80px] text-center truncate">
                  {step.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
