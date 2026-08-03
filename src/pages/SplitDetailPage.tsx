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
import { toast } from "../lib/toast";
import { QRCodeSVG } from "qrcode.react";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const split = useMemo(() => splits.find(s => s.id === id), [splits, id]);
  const isCreator = split?.createdBy === user?.uid;

  if (!split) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-lg font-bold text-foreground">Split not found</div>
          <button onClick={() => navigate("/split")} className="text-primary font-bold">Back to Splits</button>
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
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteSplit(id);
      navigate("/ledger?tab=splits");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
          className="p-3 rounded-2xl border border-border bg-card shadow-sm transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleShare}
            className="p-3 rounded-2xl border border-border bg-card shadow-sm transition-all active:scale-95 text-muted-foreground"
          >
            <Share2 size={20} />
          </button>
          {isCreator && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 shadow-sm transition-all active:scale-95 text-destructive"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden p-6 border border-border bg-card rounded-[2.5rem] shadow-xl"
      >
        <div className="absolute top-0 right-0 p-4">
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm",
            split.settled 
              ? "bg-success text-success-foreground" 
              : "bg-primary text-primary-foreground"
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
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-tighter mb-1">
              <Tag size={14} />
              {split.category}
            </div>
            <h2 className="text-3xl font-black text-foreground tracking-tight leading-none">{split.title}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                <Calendar size={14} />
                {new Date(split.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
              <div className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                By {split.createdBy === user?.uid ? "You" : (split.createdByName || "Others")}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Amount</div>
            <div className="text-4xl font-black text-foreground">₹{split.totalAmount.toLocaleString()}</div>
          </div>
        </div>
      </motion.div>

      {/* Participants List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-foreground flex items-center gap-2 ml-1">
          <Receipt size={22} className="text-primary" />
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
                  ? "bg-muted/40 border-border" 
                  : "border-border bg-card shadow-sm"
              )}
            >
              <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black overflow-hidden bg-muted",
                    p.paid 
                      ? "text-success ring-4 ring-success/10" 
                      : "text-primary ring-4 ring-primary/10"
                  )}>
                    {p.photoURL ? (
                      <img src={p.photoURL} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-2">
                      {p.name}
                      {p.userId === user?.uid && (
                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-[9px] text-primary font-black uppercase">You</span>
                      )}
                    </div>
                    <div className="text-sm font-black text-foreground mt-0.5">₹{p.amount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!p.paid && p.userId !== user?.uid && (
                    <button
                      onClick={() => handlePay(p.name, p.amount, p.upiId)}
                      className="p-3 bg-muted text-muted-foreground rounded-2xl active:scale-95 transition-all flex items-center gap-2"
                      title={isMobile() ? "Open UPI App" : "Copy UPI Payment Link"}
                    >
                      {isMobile() ? <Smartphone size={18} /> : <Copy size={18} />}
                    </button>
                  )}

                  {!p.paid && p.userId !== user?.uid && (
                    <button
                      onClick={() => handleShowQr(p.name, p.amount, p.upiId)}
                      className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
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
                          ? "bg-success border-success text-success-foreground" 
                          : "bg-card border-border text-muted-foreground"
                      )}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}

                  {!isCreator && p.paid && (
                    <div className="p-2 text-success">
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
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-3">
          <Info className="text-warning shrink-0 mt-0.5" size={16} />
          <p className="text-xs font-medium text-warning">
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
            <div className="p-6 bg-white rounded-[2.5rem] shadow-xl">
              <QRCodeSVG 
                value={qrData.upiLink} 
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="space-y-1">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest">Paying To</div>
              <div className="text-xl font-black text-foreground uppercase">{qrData.name}</div>
              <div className="text-3xl font-black text-primary">₹{qrData.amount.toLocaleString()}</div>
            </div>

            <div className="w-full pt-4 border-t border-border space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                Scan with GPay, PhonePe, Paytm or any UPI app
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrData.upiLink);
                  toast.success("UPI Link copied!");
                }}
                className="w-full py-3 px-4 bg-muted text-muted-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Copy size={16} /> Copy UPI Link
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this split?"
        message="All participants and payment status for this split will be removed."
        confirmText={isDeleting ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        variant="destructive"
        onCancel={() => !isDeleting && setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </motion.main>
  );
}
