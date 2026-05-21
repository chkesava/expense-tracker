import { useState } from "react";
import { QrCode } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import useSettings from "../hooks/useSettings";
import { generateUpiLink, isMobile } from "../utils/upi";
import { Link } from "react-router-dom";
import PaymentRequestShareCard from "./PaymentRequestShareCard";
import QrStylePicker from "./QrStylePicker";
import { getStoredQrStyleId, storeQrStyleId, type QrStyleId } from "../utils/qrStyles";

type RequestUpiPaymentProps = {
  /** Shown in UPI transaction note when set */
  notePrefix?: string;
};

export default function RequestUpiPayment({ notePrefix = "Payment" }: RequestUpiPaymentProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [qrStyleId, setQrStyleId] = useState<QrStyleId>(getStoredQrStyleId);
  const [qrData, setQrData] = useState<{ amount: number; upiLink: string } | null>(null);

  const payeeName = user?.displayName || "You";
  const upiId = settings.upiId?.trim() || "";

  const handleStyleChange = (id: QrStyleId) => {
    setQrStyleId(id);
    storeQrStyleId(id);
  };

  const handleGenerate = () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!upiId) {
      toast.error("Set your UPI ID in Settings to generate QR codes");
      return;
    }

    const txnNote = note.trim() ? `${notePrefix}: ${note.trim()}` : notePrefix;
    const upiLink = generateUpiLink(upiId, payeeName, num, txnNote);
    if (!upiLink) {
      toast.error("Could not generate payment link");
      return;
    }
    setQrData({ amount: num, upiLink });
  };

  const handleCopyLink = () => {
    if (!qrData) return;
    navigator.clipboard.writeText(qrData.upiLink).then(() => {
      toast.success(isMobile() ? "UPI link copied!" : "UPI link copied! Share the payment page or link.");
    });
  };

  const handleOpenUpi = () => {
    if (!qrData) return;
    navigator.clipboard.writeText(qrData.upiLink).then(() => {
      if (!isMobile()) toast.success("UPI link copied!");
    });
    if (isMobile()) window.location.href = qrData.upiLink;
  };

  const handleShare = async () => {
    if (!qrData) return;
    const text = `Please pay ₹${qrData.amount.toLocaleString("en-IN")} to ${payeeName} via UPI.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${payeeName}`,
          text,
          url: qrData.upiLink,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleReset = () => setQrData(null);

  const fieldClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  if (!upiId) {
    return (
      <div className="bento-card space-y-3 p-6 text-center">
        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
          Add your UPI ID in Settings to collect payments.
        </p>
        <Link to="/settings" className="text-sm font-black text-primary hover:underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="bento-card space-y-5 p-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Amount (₹)
          </label>
          <input
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className={fieldClass + " mt-2 text-2xl"}
            autoFocus
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Lunch, Rent share"
            className={fieldClass + " mt-2"}
          />
        </div>

        <QrStylePicker value={qrStyleId} onChange={handleStyleChange} />

        <p className="text-xs text-muted-foreground">
          Payments go to <span className="font-bold text-foreground">{upiId}</span>
        </p>
        <p className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          For sharing only — nothing is saved to your expenses or income.
        </p>

        <button
          type="button"
          onClick={handleGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          <QrCode size={18} />
          Create payment page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-xs font-bold text-muted-foreground">
        Share this page — screenshot or use Share
      </p>
      <PaymentRequestShareCard
        payeeName={payeeName}
        payeePhotoUrl={user?.photoURL}
        upiId={upiId}
        amount={qrData.amount}
        note={note}
        upiLink={qrData.upiLink}
        qrStyleId={qrStyleId}
        onQrStyleChange={handleStyleChange}
        onCopyLink={handleCopyLink}
        onOpenUpi={handleOpenUpi}
        onShare={handleShare}
        onEditAmount={handleReset}
      />
    </div>
  );
}
