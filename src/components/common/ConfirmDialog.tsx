import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useRef } from "react";
import { cn } from "../../lib/utils";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import Button from "../ui/Button";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  variant = "destructive",
}: {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "neutral";
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(open, panelRef);
  const icon = variant === "destructive" ? <Trash2 size={20} /> : <AlertTriangle size={20} />;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="p-6 text-center space-y-4">
              <div
                className={cn(
                  "mx-auto flex h-12 w-12 items-center justify-center rounded-full",
                  variant === "destructive" && "bg-destructive/10 text-destructive",
                  variant === "warning" && "bg-amber-500/10 text-amber-600",
                  variant === "neutral" && "bg-primary/10 text-primary"
                )}
              >
                {icon}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onCancel} className="w-full">
                  {cancelText}
                </Button>
                <Button
                  type="button"
                  variant={variant === "destructive" ? "destructive" : "primary"}
                  onClick={onConfirm}
                  className={cn(
                    "w-full",
                    variant === "warning" && "bg-amber-600 hover:bg-amber-700 text-white"
                  )}
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

