import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Check,
  Copy,
  ExternalLink,
  Maximize2,
  X,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Eye
} from 'lucide-react';
import { Trade } from '../types';

interface TradeQRCodeProps {
  trade: Trade;
  initialType?: 'status' | 'pay' | 'confirm';
  compact?: boolean;
}

export const TradeQRCode: React.FC<TradeQRCodeProps> = ({
  trade,
  initialType = 'status',
  compact = false,
}) => {
  const [targetType, setTargetType] = useState<'status' | 'pay' | 'confirm'>(initialType);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const getUrl = (type: 'status' | 'pay' | 'confirm') => {
    switch (type) {
      case 'pay':
        return `${origin}/trade/${trade.id}/pay`;
      case 'confirm':
        return `${origin}/trade/${trade.id}/confirm`;
      case 'status':
      default:
        return `${origin}/trade/${trade.id}/status`;
    }
  };

  const currentUrl = getUrl(targetType);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
    }
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:border-blue-400 transition-all cursor-pointer"
          title="Open In-Person QR Code"
        >
          <QrCode className="w-4 h-4 text-blue-600" />
          <span>In-Person QR</span>
        </button>

        {isModalOpen && (
          <QRModal
            trade={trade}
            targetType={targetType}
            setTargetType={setTargetType}
            currentUrl={currentUrl}
            copied={copied}
            handleCopy={handleCopy}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              In-Person Trade QR Code
            </h3>
            <p className="text-[11px] text-slate-400">
              Scan with smartphone camera to open trade instantly
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Enlarge QR Code"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Target Selector (Status vs Pay vs Confirm) */}
      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setTargetType('status')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
            targetType === 'status'
              ? 'bg-white text-slate-900 font-bold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Status Page
        </button>

        {trade.status === 'pending' && (
          <button
            type="button"
            onClick={() => setTargetType('pay')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
              targetType === 'pay'
                ? 'bg-white text-blue-700 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buyer Pay
          </button>
        )}

        {(trade.status === 'paid' || trade.status === 'confirmed') && (
          <button
            type="button"
            onClick={() => setTargetType('confirm')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
              targetType === 'confirm'
                ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Seller Confirm
          </button>
        )}
      </div>

      {/* QR Code Presentation */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* QR Code Box */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="relative group p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs shrink-0 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
        >
          <QRCodeSVG
            value={currentUrl}
            size={130}
            level="M"
            marginSize={2}
            className="block rounded-lg"
          />
          <div className="absolute inset-0 bg-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="bg-slate-900/85 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-xs flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              <span>Tap to Enlarge</span>
            </span>
          </div>
        </div>

        {/* Info & Scan Guidance */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600 font-semibold">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Fast In-Person Handshake</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Have the other party point their iPhone or Android camera at this QR code. It opens the live trade page immediately without needing to exchange phone numbers or copy links.
          </p>

          {/* Quick Copy Link Bar */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 font-medium transition-colors"
            >
              <span>Test Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <QRModal
          trade={trade}
          targetType={targetType}
          setTargetType={setTargetType}
          currentUrl={currentUrl}
          copied={copied}
          handleCopy={handleCopy}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

// Full-Screen / Enlarged In-Person Modal
interface QRModalProps {
  trade: Trade;
  targetType: 'status' | 'pay' | 'confirm';
  setTargetType: (type: 'status' | 'pay' | 'confirm') => void;
  currentUrl: string;
  copied: boolean;
  handleCopy: () => void;
  onClose: () => void;
}

const QRModal: React.FC<QRModalProps> = ({
  trade,
  targetType,
  setTargetType,
  currentUrl,
  copied,
  handleCopy,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 border border-blue-100">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Scan Trade QR Code
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hold up your phone for the other party to scan
          </p>
        </div>

        {/* Item & Price Badge */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-4 text-center">
          <p className="text-xs font-bold text-slate-900 truncate">
            {trade.itemName}
          </p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            ${Number(trade.price || 0).toFixed(2)} USD · ID: {trade.id}
          </p>
        </div>

        {/* QR Code Switcher Pills */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTargetType('status')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
              targetType === 'status'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Status
          </button>
          {trade.status === 'pending' && (
            <button
              type="button"
              onClick={() => setTargetType('pay')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                targetType === 'pay'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pay Now
            </button>
          )}
          {(trade.status === 'paid' || trade.status === 'confirmed') && (
            <button
              type="button"
              onClick={() => setTargetType('confirm')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                targetType === 'confirm'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Confirm
            </button>
          )}
        </div>

        {/* Large High-Contrast QR Code */}
        <div className="flex justify-center my-2 p-4 bg-white border-2 border-slate-900/10 rounded-2xl shadow-inner">
          <QRCodeSVG
            value={currentUrl}
            size={220}
            level="H"
            marginSize={2}
            className="block rounded-lg"
          />
        </div>

        {/* URL String & Copy Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <span className="font-mono text-slate-600 truncate flex-1 select-all">
              {currentUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-slate-500 hover:text-blue-600 font-bold transition-colors cursor-pointer shrink-0"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
