

import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
}: {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}) {
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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/50"
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                🗑️
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={onCancel}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors active:scale-95"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

