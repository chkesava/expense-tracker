import { useState, useRef } from "react";
import { Camera, Loader2, X, CheckCircle2 } from "lucide-react";
import { extractTextFromImage } from "../services/ocrService";
import { parseReceiptText } from "../services/aiService";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import type { ParsedExpense } from "../utils/magicParser";

interface ReceiptScannerProps {
  onScanResult: (result: ParsedExpense) => void;
  className?: string;
}

export default function ReceiptScanner({ onScanResult, className }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [step, setStep] = useState<"idle" | "uploading" | "parsing" | "success">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setStep("uploading");
    
    try {
      // 1. Extract Text via OCR
      const rawText = await extractTextFromImage(file);
      
      setStep("parsing");
      // 2. Parse Text via AI
      const result = await parseReceiptText(rawText);
      
      setStep("success");
      setTimeout(() => {
        onScanResult(result);
        setIsScanning(false);
        setStep("idle");
        toast.success("Receipt scanned successfully!");
      }, 1000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to scan receipt");
      setIsScanning(false);
      setStep("idle");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerCapture = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <button
        type="button"
        onClick={triggerCapture}
        disabled={isScanning}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm",
          isScanning 
            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
            : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/5 hover:border-indigo-500"
        )}
      >
        {isScanning ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <Camera size={14} />
        )}
        {isScanning ? "Scanning..." : "Scan Receipt"}
      </button>

      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md"
          >
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/10">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {step === "success" ? (
                    <CheckCircle2 className="text-emerald-500" size={32} />
                  ) : (
                    <Camera className="text-indigo-500" size={32} />
                  )}
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                {step === "uploading" ? "Uploading Image" : step === "parsing" ? "AI Analysis" : "Success!"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {step === "uploading" 
                  ? "Sending your receipt to the cloud for text extraction..." 
                  : step === "parsing" 
                    ? "Our AI is identifying amount, date, and merchant details." 
                    : "Data extracted and ready to fill the form."}
              </p>

              {step !== "success" && (
                <button
                  type="button"
                  onClick={() => setIsScanning(false)}
                  className="mt-8 p-2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
