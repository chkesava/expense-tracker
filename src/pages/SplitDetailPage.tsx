import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSplits } from "../hooks/useSplits";
import { useAuth } from "../hooks/useAuth";
import useSettings from "../hooks/useSettings";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Share2,
  Copy,
  ExternalLink,
  IndianRupee,
  Calendar,
  Tag,
  Receipt,
  Info
} from "lucide-react";
import { cn } from "../lib/utils";
import { generateUpiLink, isMobile } from "../utils/upi";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import Modal from "../components/common/Modal";
import { QrCode as QrCodeIcon } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function SplitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { splits, updateParticipantStatus, deleteSplit } = useSplits();
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const [qrData, setQrData] = useState<{ name: string, amount: number, upiLink: string } | null>(null);
  
  const split = useMemo(() => splits.find(s => s.id === id), [splits, id]);
  const isCreator = split?.createdBy === user?.uid;

  if (!split) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-lg font-bold text-slate-900 dark:text-white">Split not found</div>
          <button onClick={() => navigate("/split")} className="text-blue-600 font-bold">Back to Splits</button>
        </div>
      </div>
    );
  }

  const handlePay = (name: string, amount: number, upiId?: string) => {
    const targetUpi = upiId || (isCreator ? settings.upiId : ""); 
    const upiLink = generateUpiLink(targetUpi || "", name, amount, `Split: ${split.title}`);
    
    if (!upiLink) {
      toast.error("No UPI ID available for this payment");
      return;
    }

    // Always copy to clipboard first
    navigator.clipboard.writeText(upiLink).then(() => {
      if (!isMobile()) {
        toast.success("UPI link copied! Share it with your friend.");
      }
    });

    // Only attempt to launch UPI apps on mobile devices
    if (isMobile()) {
      window.location.href = upiLink;
    }
  };

  const handleShowQr = (name: string, amount: number, upiId?: string) => {
    const targetUpi = upiId || (isCreator ? settings.upiId : ""); 
    const upiLink = generateUpiLink(targetUpi || "", name, amount, `Split: ${split.title}`);

    if (!upiLink) {
      toast.error("Set your UPI ID in Settings to generate QR codes");
      return;
    }

    setQrData({ name, amount, upiLink });
  };

  const handleShare = () => {
    const text = `Pay for ${split.title}: ₹${split.totalAmount}\nSplit link: ${window.location.href}`;
    if (navigator.share) {
      navigator.share({
        title: split.title,
        text,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied share text to clipboard");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this split?")) {
      await deleteSplit(id!);
      navigate("/split");
    }
  };

  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-xl mx-auto px-4 pt-20 pb-28 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/split")}
          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleShare}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all active:scale-95 text-slate-600"
          >
            <Share2 size={20} />
          </button>
          {isCreator && (
            <button 
              onClick={handleDelete}
              className="p-3 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm transition-all active:scale-95 text-rose-600"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none"
      >
        <div className="absolute top-0 right-0 p-4">
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm",
            split.settled 
              ? "bg-emerald-500 text-white" 
              : "bg-blue-600 text-white"
          )}>
            {split.settled ? (
              <><CheckCircle2 size={14} /> Settled</>
            ) : (
              <><Clock size={14} /> Active</>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-tighter mb-1">
              <Tag size={14} />
              {split.category}
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{split.title}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                <Calendar size={14} />
                {new Date(split.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
              <div className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                By {split.createdBy === user?.uid ? "You" : (split.createdByName || "Others")}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</div>
            <div className="text-4xl font-black text-slate-900 dark:text-white">₹{split.totalAmount.toLocaleString()}</div>
          </div>
        </div>
      </motion.div>

      {/* Participants List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 ml-1">
          <Receipt size={22} className="text-blue-500" />
          Participants
        </h3>

        <div className="space-y-3">
          {split.participants.map((p, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={cn(
                "p-4 rounded-3xl border transition-all relative overflow-hidden",
                p.paid 
                  ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800" 
                  : "bg-white dark:bg-slate-900 border-white shadow-sm dark:border-slate-800"
              )}
            >
              <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black overflow-hidden bg-slate-100 dark:bg-slate-800",
                    p.paid 
                      ? "text-emerald-600 ring-4 ring-emerald-50 dark:ring-emerald-500/10" 
                      : "text-blue-600 ring-4 ring-blue-50 dark:ring-blue-500/10"
                  )}>
                    {p.photoURL ? (
                      <img src={p.photoURL} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {p.name}
                      {p.userId === user?.uid && (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-[9px] text-blue-600 font-black uppercase">You</span>
                      )}
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">₹{p.amount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!p.paid && p.userId !== user?.uid && (
                    <button
                      onClick={() => handlePay(p.name, p.amount, p.upiId)}
                      className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl active:scale-95 transition-all flex items-center gap-2"
                      title={isMobile() ? "Open UPI App" : "Copy UPI Payment Link"}
                    >
                      {isMobile() ? <Smartphone size={18} /> : <Copy size={18} />}
                    </button>
                  )}

                  {!p.paid && p.userId !== user?.uid && (
                    <button
                      onClick={() => handleShowQr(p.name, p.amount, p.upiId)}
                      className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                      title="Show Payment QR Code"
                    >
                      <QrCodeIcon size={18} />
                      <span className="text-xs font-bold px-1 text-white">QR</span>
                    </button>
                  )}
                  
                  
                  {isCreator && (
                    <button
                      onClick={() => updateParticipantStatus(id!, index, !p.paid)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all active:scale-95",
                        p.paid 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                      )}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}

                  {!isCreator && p.paid && (
                    <div className="p-2 text-emerald-500">
                      <CheckCircle2 size={24} />
                    </div>
                  )}
                </div>
              </div>

              {p.paid && (
                <div className="absolute right-0 bottom-0 p-1 opacity-10">
                  <CheckCircle2 size={64} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {!split.settled && isCreator && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
          <Info className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            As the creator, you can mark participants as paid when you receive their share. The split will be settled once everyone has paid.
          </p>
        </div>
      )}

      {/* UPI QR Modal */}
      <Modal
        isOpen={!!qrData}
        onClose={() => setQrData(null)}
        title="Payment QR Code"
      >
        {qrData && (
          <div className="flex flex-col items-center justify-center p-4 space-y-6 text-center">
            <div className="p-6 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50">
              <QRCodeSVG 
                value={qrData.upiLink} 
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="space-y-1">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Paying To</div>
              <div className="text-xl font-black text-slate-900 dark:text-white uppercase">{qrData.name}</div>
              <div className="text-3xl font-black text-blue-600">₹{qrData.amount.toLocaleString()}</div>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Scan with GPay, PhonePe, Paytm or any UPI app
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrData.upiLink);
                  toast.success("UPI Link copied!");
                }}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Copy size={16} /> Copy UPI Link
              </button>
            </div>
          </div>
        )}
      </Modal>
    </motion.main>
  );
}
