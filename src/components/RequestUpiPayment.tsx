import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import useSettings from "../hooks/useSettings";
import { Link } from "react-router-dom";
import QrStylePicker from "./QrStylePicker";
import { getStoredQrStyleId, storeQrStyleId, type QrStyleId } from "../utils/qrStyles";
import { usePaymentRequests } from "../hooks/usePaymentRequests";

type RequestUpiPaymentProps = {
  notePrefix?: string;
  onCreated?: (requestId: string) => void;
};

export default function RequestUpiPayment({
  notePrefix = "Payment",
  onCreated,
}: RequestUpiPaymentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { createPaymentRequest } = usePaymentRequests();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [qrStyleId, setQrStyleId] = useState<QrStyleId>(getStoredQrStyleId);
  const [submitting, setSubmitting] = useState(false);

  const payeeName = user?.displayName || "You";
  const upiId = settings.upiId?.trim() || "";

  const handleStyleChange = (id: QrStyleId) => {
    setQrStyleId(id);
    storeQrStyleId(id);
  };

  const handleGenerate = async () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!upiId) {
      toast.error("Set your UPI ID in Settings to generate QR codes");
      return;
    }

    setSubmitting(true);
    try {
      const id = await createPaymentRequest({
        amount: num,
        note: note.trim() || undefined,
        notePrefix,
        payeeName,
        payeePhotoUrl: user?.photoURL ?? undefined,
        upiId,
        qrStyleId,
      });
      onCreated?.(id);
      navigate(`/payment/${id}`);
    } catch {
      toast.error("Failed to save payment page");
    } finally {
      setSubmitting(false);
    }
  };

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
        Saved to your ledger — share the page link (includes QR). Not added to expenses or income.
      </p>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
      >
        <QrCode size={18} />
        {submitting ? "Saving…" : "Create & open payment page"}
      </button>
    </div>
  );
}
