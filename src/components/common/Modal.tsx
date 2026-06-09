import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "../../lib/utils";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useTheme } from "../../hooks/useTheme";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useFocusTrap(isOpen, panelRef);
  const { theme } = useTheme();
  const isClay = theme === "claymorphism";

  // Close on Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Focus first focusable element when opened.
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const firstFocusable = panel.querySelector<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        /* On mobile: align to top so bottom nav doesn't cover the modal */
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 400 }}
            ref={panelRef}
            className={cn(
              // Mobile: full-width sheet from bottom with rounded top corners
              // Desktop: centered card with full rounded corners
              "relative w-full sm:max-w-lg premium-glass shadow-2xl overflow-hidden flex flex-col border border-white/20 will-change-transform",
              isClay 
                ? "rounded-t-[2.5rem] sm:rounded-[2.5rem]" 
                : "rounded-t-[2rem] sm:rounded-[2rem]",
              // Height: on mobile leave space for bottom nav (~80px) + safe area
              "max-h-[85dvh] sm:max-h-[90dvh]",
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
          >
            {/* Drag handle — mobile only */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              {title && (
                <h2 id={titleId} className="text-xl font-black text-gradient-premium tracking-tighter">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="p-2 -mr-1 bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all active:scale-90"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body — scrollable, with bottom padding so content clears nav */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-6 sm:pb-8 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
