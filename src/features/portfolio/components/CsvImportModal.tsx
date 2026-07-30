import { useState, useRef } from "react";
import Papa from "papaparse";
import { UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/ui/Button";
import { useHoldings, type CreateHoldingInput } from "../hooks/useHoldings";
import { toast } from "react-toastify";
import type { InstrumentType, Exchange } from "../types";
import { todayKey } from "../hooks/useHoldings";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CsvImportModal({ isOpen, onClose, onSuccess }: CsvImportModalProps) {
  const { overwriteHoldings } = useHoldings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CreateHoldingInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCsv = (uploadedFile: File) => {
    setFile(uploadedFile);
    setError(null);
    setParsedData([]);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors && results.errors.length > 0) {
            console.warn("CSV parsing errors", results.errors);
          }

          const mappedHoldings: CreateHoldingInput[] = [];

          results.data.forEach((row: any) => {
            // Smart guessing column names (Groww, Zerodha, etc)
            const getCol = (keys: string[]) => {
              const foundKey = Object.keys(row).find((k) => 
                keys.some(key => k.trim().toLowerCase().includes(key.toLowerCase()))
              );
              return foundKey ? row[foundKey] : null;
            };

            const rawSymbol = getCol(["Instrument", "Symbol", "Company", "Scrip"]);
            const rawQty = getCol(["Qty", "Quantity", "Shares"]);
            const rawPrice = getCol(["Avg Price", "Average Price", "Buy Price", "Avg. Price", "Avg. Cost"]);

            if (rawSymbol && rawQty && rawPrice) {
              const qty = parseFloat(rawQty.toString().replace(/,/g, ""));
              const price = parseFloat(rawPrice.toString().replace(/,/g, ""));

              if (!isNaN(qty) && !isNaN(price) && qty > 0) {
                // Auto-append .NS for Indian stocks (Groww/Zerodha context)
                let formattedSymbol = rawSymbol.toString().trim().toUpperCase();
                // Basic cleanup of broker suffixes if they exist
                formattedSymbol = formattedSymbol.replace(/EQ$/, "").trim();
                const yahooSymbol = formattedSymbol.endsWith(".NS") || formattedSymbol.endsWith(".BO") 
                  ? formattedSymbol 
                  : `${formattedSymbol}.NS`;

                mappedHoldings.push({
                  symbol: formattedSymbol,
                  yahooSymbol,
                  name: formattedSymbol,
                  exchange: "NSE", // Default assumption
                  instrumentType: "stock", // Default assumption
                  quantity: qty,
                  averageBuyPrice: price,
                  datePurchased: todayKey(),
                });
              }
            }
          });

          if (mappedHoldings.length === 0) {
            setError("Could not find required columns (Symbol, Quantity, Avg Price) or no valid rows found.");
          } else {
            setParsedData(mappedHoldings);
          }
        } catch (err) {
          console.error("Parse mapping error", err);
          setError("Failed to parse the CSV format.");
        }
      },
      error: (err) => {
        setError("Error parsing CSV: " + err.message);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseCsv(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        parseCsv(droppedFile);
      } else {
        setError("Please upload a valid .csv file");
      }
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    const success = await overwriteHoldings(parsedData);
    setLoading(false);
    if (success) {
      toast.success(`Imported ${parsedData.length} holdings successfully!`);
      if (onSuccess) onSuccess();
      handleClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import from CSV (Groww/Zerodha)">
      <div className="space-y-6">
        {!file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <UploadCloud className="mx-auto mb-4 text-muted-foreground" size={32} />
            <p className="font-semibold mb-1">Click to upload or drag & drop</p>
            <p className="text-sm text-muted-foreground">Supported formats: .csv</p>
            <p className="text-xs text-muted-foreground mt-4">
              Requires columns resembling: Instrument, Qty, Avg Price
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3 text-emerald-600">
              <CheckCircle size={18} className="shrink-0" />
              <div className="text-sm font-medium">
                Successfully parsed {parsedData.length} holdings ready for import.
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-medium">Symbol</th>
                    <th className="px-4 py-2 font-medium text-right">Qty</th>
                    <th className="px-4 py-2 font-medium text-right">Avg Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedData.slice(0, 10).map((h, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{h.symbol}</td>
                      <td className="px-4 py-2 text-right">{h.quantity}</td>
                      <td className="px-4 py-2 text-right">₹{h.averageBuyPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                  {parsedData.length > 10 && (
                    <tr className="bg-muted/10">
                      <td colSpan={3} className="px-4 py-2 text-center text-xs text-muted-foreground">
                        + {parsedData.length - 10} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-xs font-medium flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Warning: Proceeding will <b>OVERWRITE</b> all your existing holdings. Make sure this CSV contains your full portfolio.</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={resetState}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "Importing..." : "Confirm & Import"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
