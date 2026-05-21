import { Copy, Share2, Shield, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import Avatar from "./Avatar";
import UpiPaymentQr from "./UpiPaymentQr";
import QrStylePicker from "./QrStylePicker";
import { cn } from "../lib/utils";
import { getQrStyle, storeQrStyleId, type QrStyleId } from "../utils/qrStyles";
import { isMobile } from "../utils/upi";

const UPI_APPS = ["GPay", "PhonePe", "Paytm", "BHIM"];

type PaymentRequestShareCardProps = {
  payeeName: string;
  payeePhotoUrl?: string | null;
  upiId: string;
  amount: number;
  note?: string;
  upiLink: string;
  qrStyleId: QrStyleId;
  onQrStyleChange: (id: QrStyleId) => void;
  /** Copies the public payment page URL (with QR), not the raw UPI deep link */
  onCopyLink: () => void;
  onCopyUpiLink?: () => void;
  onOpenUpi: () => void;
  onShare?: () => void;
  onEditAmount?: () => void;
  readOnly?: boolean;
  sharePageUrl?: string;
};

function maskUpiId(upiId: string): string {
  const at = upiId.indexOf("@");
  if (at <= 2) return upiId;
  return `${upiId.slice(0, 2)}••••${upiId.slice(at)}`;
}

export default function PaymentRequestShareCard({
  payeeName,
  payeePhotoUrl,
  upiId,
  amount,
  note,
  upiLink,
  qrStyleId,
  onQrStyleChange,
  onCopyLink,
  onCopyUpiLink,
  onOpenUpi,
  onShare,
  onEditAmount,
  readOnly = false,
  sharePageUrl,
}: PaymentRequestShareCardProps) {
  const qrStyle = getQrStyle(qrStyleId);

  const handleStyleChange = (id: QrStyleId) => {
    storeQrStyleId(id);
    onQrStyleChange(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[2rem] border border-white/20 bg-white text-slate-900 shadow-2xl shadow-indigo-900/15 dark:border-white/10 dark:shadow-black/40"
      id="payment-request-card"
    >
      {/* Header — payment-app style */}
      <div className={cn("relative px-6 pb-16 pt-8 text-white bg-gradient-to-br", qrStyle.header)}>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-4 left-4 h-24 w-24 rounded-full bg-black/10 blur-xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <Avatar
            src={payeePhotoUrl}
            name={payeeName}
            size={52}
            className="ring-2 ring-white/40 shadow-lg"
          />
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              Payment request
            </p>
            <p className="truncate text-lg font-black">{payeeName}</p>
            <p className="text-xs font-bold text-white/80">{maskUpiId(upiId)}</p>
          </div>
        </div>
        <div className="relative mt-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Amount to pay</p>
          <p className="mt-1 text-5xl font-black tracking-tight">
            ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
          {note?.trim() && (
            <p className="mt-2 text-sm font-semibold text-white/90">&ldquo;{note.trim()}&rdquo;</p>
          )}
        </div>
      </div>

      {/* QR panel — always light for reliable scanning */}
      <div className="-mt-10 relative z-10 mx-4 rounded-[1.75rem] border border-slate-100 bg-white px-5 pb-6 pt-8 shadow-lg">
        <UpiPaymentQr
          value={upiLink}
          style={qrStyle}
          size={208}
          centerImageSrc={payeePhotoUrl}
        />

        <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Scan with any UPI app
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {UPI_APPS.map((app) => (
            <span
              key={app}
              className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600"
            >
              {app}
            </span>
          ))}
        </div>

        {!readOnly && (
          <div className="mt-5">
            <QrStylePicker value={qrStyleId} onChange={handleStyleChange} />
          </div>
        )}
        {sharePageUrl && (
          <p className="mt-4 truncate rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-mono text-slate-500">
            {sharePageUrl}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3 px-4 pb-6 pt-4">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
          <Shield size={14} className="text-emerald-600" />
          Secured by UPI · Not saved to your expense ledger
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCopyLink}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-800 shadow-sm transition active:scale-[0.98]"
          >
            <Copy size={16} />
            Copy page link
          </button>
          {onShare ? (
            <button
              type="button"
              onClick={onShare}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white shadow-lg transition active:scale-[0.98]"
            >
              <Share2 size={16} />
              Share
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenUpi}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white shadow-lg transition active:scale-[0.98]"
            >
              <Smartphone size={16} />
              {isMobile() ? "Open UPI" : "Copy & share"}
            </button>
          )}
        </div>

        {onShare && (
          <button
            type="button"
            onClick={onOpenUpi}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition active:scale-[0.98]"
          >
            <Smartphone size={16} />
            {isMobile() ? "Open in UPI app" : "Open UPI deep link"}
          </button>
        )}

        {onCopyUpiLink && (
          <button
            type="button"
            onClick={onCopyUpiLink}
            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Copy UPI app link (advanced)
          </button>
        )}

        {onEditAmount && (
          <button
            type="button"
            onClick={onEditAmount}
            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Change amount or note
          </button>
        )}
      </div>
    </motion.div>
  );
}
