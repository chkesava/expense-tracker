import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Copy,
  History,
  Loader2,
  Plus,
  QrCode,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import RequestUpiPayment from "../components/RequestUpiPayment";
import { usePaymentRequests } from "../hooks/usePaymentRequests";
import Amount from "../components/common/Amount";
import { cn } from "../lib/utils";
import { getPaymentRequestShareUrl } from "../utils/paymentRequestUrl";

type CollectTab = "requests" | "new";

export default function PaymentRequestsPage({ hideHeader }: { hideHeader?: boolean }) {
  const { requests, loading, deletePaymentRequest } = usePaymentRequests();
  const [activeTab, setActiveTab] = useState<CollectTab>("requests");

  const tabs = [
    { id: "requests" as const, label: "Saved", icon: <History size={16} /> },
    { id: "new" as const, label: "New", icon: <Plus size={16} /> },
  ];

  const copyShareLink = (slug: string) => {
    const url = getPaymentRequestShareUrl(slug);
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Payment page link copied!");
    });
  };

  const shareLink = async (slug: string, payeeName: string, amount: number) => {
    const url = getPaymentRequestShareUrl(slug);
    const text = `Please pay ₹${amount.toLocaleString("en-IN")} to ${payeeName}. Scan the QR:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Pay ${payeeName}`, text, url });
      } catch (err) {
        if ((err as Error).name !== "AbortError") copyShareLink(slug);
      }
    } else {
      copyShareLink(slug);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn(!hideHeader && "")}>
      <div className="mb-6 flex gap-2 rounded-2xl bg-muted/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition-all",
              activeTab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {activeTab === "new" ? (
            <RequestUpiPayment notePrefix="Payment" />
          ) : (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="bento-card py-16 text-center">
                  <QrCode className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-bold text-muted-foreground">No saved payment pages yet</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("new")}
                    className="mt-4 text-sm font-black text-primary"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-4 transition hover:bg-muted/30"
                    >
                      <Link
                        to={`/payment/${r.slug}`}
                        className="flex min-w-0 flex-1 items-center gap-4"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <QrCode size={22} />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate font-bold text-foreground">
                            {r.note?.trim() || "Payment request"}
                          </p>
                          <p className="text-lg font-black text-primary">
                            <Amount value={r.amount} />
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </Link>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => shareLink(r.slug, r.payeeName, r.amount)}
                          className="rounded-xl p-2 text-primary hover:bg-primary/10"
                          title="Share page with QR"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => copyShareLink(r.slug)}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
                          title="Copy page link"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Delete this payment page?")) deletePaymentRequest(r.slug);
                          }}
                          className="rounded-xl p-2 text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
