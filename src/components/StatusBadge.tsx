import React from 'react';
import { TradeStatus } from '../types';
import { Clock, ShieldCheck, CheckCircle2, AlertTriangle, KeyRound, XCircle, RotateCcw } from 'lucide-react';

interface StatusBadgeProps {
  status: TradeStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<
    TradeStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    pending: {
      label: 'Awaiting Payment',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    },
    paid: {
      label: 'Payment Held in Escrow',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: <KeyRound className="w-3.5 h-3.5 text-blue-600" />,
    },
    confirmed: {
      label: 'Code Verified',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />,
    },
    released: {
      label: 'Funds Released to Seller',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    flagged: {
      label: 'Flagged for Review',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
    },
    refunded: {
      label: 'Refunded by Platform',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      icon: <RotateCcw className="w-3.5 h-3.5 text-purple-600" />,
    },
  };

  const current = configs[status] || configs.pending;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
