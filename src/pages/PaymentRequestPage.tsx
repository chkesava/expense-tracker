import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import PaymentRequestShareCard from "../components/PaymentRequestShareCard";
import { fetchPaymentRequestBySlug, usePaymentRequests } from "../hooks/usePaymentRequests";
import { useAuth } from "../hooks/useAuth";
import { generateUpiLink, isMobile } from "../utils/upi";
import { getPaymentRequestShareUrl } from "../utils/paymentRequestUrl";
import type { PaymentRequest } from "../types/paymentRequest";
import type { QrStyleId } from "../utils/qrStyles";
import { getStoredQrStyleId } from "../utils/qrStyles";
import AuraBackground from "../components/layout/AuraBackground";
import { getPaymentSlugFromLocation } from "../utils/paymentRequestPath";

export default function PaymentRequestPage() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateQrStyle, deletePaymentRequest } = usePaymentRequests();

  const slug = getPaymentSlugFromLocation(location.pathname, routeSlug);

  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qrStyleId, setQrStyleId] = useState<QrStyleId>(getStoredQrStyleId);

  const isOwner = !!user && request?.createdBy === user.uid;
  const paymentSlug = request?.slug ?? slug ?? "";

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setLoadError("Invalid payment link.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetchPaymentRequestBySlug(slug)
      .then((data) => {
        setRequest(data);
        if (!data) setLoadError("This payment page does not exist or was deleted.");
        if (data?.qrStyleId) setQrStyleId(data.qrStyleId);
        if (data) {
          document.title = `Pay ₹${data.amount} — ${data.payeeName}`;
        }
      })
      .catch((err: { code?: string }) => {
        console.error(err);
        if (err?.code === "permission-denied") {
          setLoadError("Cannot load payment page. Publish Firestore rules for paymentRequests.");
        } else {
          setLoadError("Could not load payment page. Check your connection and try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const upiLink = useMemo(() => {
    if (!request) return "";
    const txnNote = request.note?.trim()
      ? `${request.notePrefix}: ${request.note.trim()}`
      : request.notePrefix;
    return generateUpiLink(
      request.upiId,
      request.payeeName,
      request.amount,
      txnNote
    );
  }, [request]);

  const sharePageUrl = paymentSlug ? getPaymentRequestShareUrl(paymentSlug) : "";

  const handleStyleChange = async (id: QrStyleId) => {
    setQrStyleId(id);
    if (isOwner && paymentSlug) {
      try {
        await updateQrStyle(paymentSlug, id);
      } catch {
        toast.error("Could not save QR style");
      }
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(sharePageUrl).then(() => {
      toast.success("Payment page link copied!");
    });
  };

  const handleCopyUpiLink = () => {
    if (!upiLink) return;
    navigator.clipboard.writeText(upiLink).then(() => {
      toast.success("UPI deep link copied");
    });
  };

  const handleOpenUpi = () => {
    if (!upiLink) return;
    navigator.clipboard.writeText(upiLink);
    if (isMobile()) window.location.href = upiLink;
    else toast.success("UPI link copied");
  };

  const handleShare = async () => {
    if (!request) return;
    const text = `Please pay ₹${request.amount.toLocaleString("en-IN")} to ${request.payeeName}. Scan the QR here:`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${request.payeeName}`,
          text,
          url: sharePageUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") handleCopyShareLink();
      }
    } else {
      handleCopyShareLink();
    }
  };

  const handleDelete = async () => {
    if (!paymentSlug || !confirm("Delete this payment page? The shared link will stop working.")) return;
    await deletePaymentRequest(paymentSlug);
    navigate(user ? "/ledger?tab=collect" : "/");
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request || request.status === "cancelled") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-bold text-foreground">Payment page not found</p>
        {loadError && (
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        )}
        {slug && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">/payment/{slug}</p>
        )}
        {user ? (
          <Link to="/ledger?tab=collect" className="mt-4 inline-block text-sm font-bold text-primary">
            Back to Collect
          </Link>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Ask the sender to share a new link from the app.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <AuraBackground />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto min-h-[100dvh] max-w-md px-4 pb-12 pt-8 md:px-6"
      >
        <div className="mb-4 flex items-center justify-between">
          {user ? (
            <button
              type="button"
              onClick={() =>
                isOwner ? navigate("/ledger?tab=collect") : navigate(-1)
              }
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {isOwner ? "Collect" : "Back"}
            </button>
          ) : (
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              UPI Payment
            </span>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl p-2 text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        <PaymentRequestShareCard
          payeeName={request.payeeName}
          payeePhotoUrl={request.payeePhotoUrl}
          upiId={request.upiId}
          amount={request.amount}
          note={request.note}
          upiLink={upiLink}
          qrStyleId={qrStyleId}
          onQrStyleChange={handleStyleChange}
          onCopyLink={handleCopyShareLink}
          onCopyUpiLink={handleCopyUpiLink}
          onOpenUpi={handleOpenUpi}
          onShare={handleShare}
          readOnly={!isOwner}
          sharePageUrl={sharePageUrl}
        />
      </motion.main>
    </>
  );
}
