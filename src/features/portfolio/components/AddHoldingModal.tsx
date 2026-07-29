import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/common/Modal";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import SymbolSearchInput from "./SymbolSearchInput";
import { addHoldingSchema, type AddHoldingInput } from "../schemas";
import { useHoldings } from "../hooks/useHoldings";
import { usePortfolioSettings } from "../hooks/usePortfolioSettings";
import { usePortfolioTransactions } from "../hooks/usePortfolioTransactions";
import type { HoldingWithMetrics, SearchResult } from "../types";
import { fieldClass } from "../utils/styles";
import { toLocalDateKey } from "../../../utils/dates";
import { toast } from "react-toastify";

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInstrumentType?: "stock" | "etf";
  editingHolding?: HoldingWithMetrics | null;
}

export default function AddHoldingModal({
  isOpen,
  onClose,
  defaultInstrumentType = "stock",
  editingHolding = null,
}: AddHoldingModalProps) {
  const { addHolding, updateHolding, findBySymbol } = useHoldings();
  const { addTransaction } = usePortfolioTransactions();
  const { completeOnboarding } = usePortfolioSettings();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddHoldingInput>({
    resolver: zodResolver(addHoldingSchema),
    defaultValues: {
      exchange: "NSE",
      instrumentType: defaultInstrumentType,
      symbol: "",
      yahooSymbol: "",
      name: "",
      quantity: 1,
      averageBuyPrice: 0,
      targetPrice: undefined,
      datePurchased: toLocalDateKey(new Date()),
    },
  });

  useEffect(() => {
    if (isOpen && editingHolding) {
      reset({
        exchange: editingHolding.exchange,
        instrumentType: editingHolding.instrumentType === "etf" ? "etf" : "stock",
        symbol: editingHolding.symbol,
        yahooSymbol: editingHolding.yahooSymbol,
        name: editingHolding.name,
        quantity: editingHolding.quantity,
        averageBuyPrice: editingHolding.averageBuyPrice,
        targetPrice: editingHolding.targetPrice,
        broker: editingHolding.broker,
        datePurchased: editingHolding.datePurchased ?? "",
      });
    } else if (isOpen) {
      reset({
        exchange: "NSE",
        instrumentType: defaultInstrumentType,
        symbol: "",
        yahooSymbol: "",
        name: "",
        quantity: 1,
        averageBuyPrice: 0,
        targetPrice: undefined,
        datePurchased: toLocalDateKey(new Date()),
      });
    }
  }, [isOpen, defaultInstrumentType, editingHolding, reset]);

  const onSelectSymbol = (result: SearchResult) => {
    setValue("symbol", result.symbol);
    setValue("yahooSymbol", result.yahooSymbol);
    setValue("name", result.name);
    setValue("exchange", result.exchange);
    setValue(
      "instrumentType",
      result.instrumentType === "etf" ? "etf" : "stock"
    );
  };

  const onSubmit = handleSubmit(async (data) => {
    const existing = findBySymbol(data.symbol, data.exchange);
    if (existing && existing.id !== editingHolding?.id) {
      toast.info("This holding already exists in your portfolio");
      return;
    }

    if (editingHolding) {
      await updateHolding(editingHolding.id, {
        symbol: data.symbol.toUpperCase(),
        yahooSymbol: data.yahooSymbol,
        name: data.name,
        exchange: data.exchange,
        instrumentType: data.instrumentType,
        quantity: data.quantity,
        averageBuyPrice: data.averageBuyPrice,
        targetPrice: data.targetPrice,
        targetAlertTriggeredAt:
          data.targetPrice === editingHolding.targetPrice
            ? editingHolding.targetAlertTriggeredAt
            : null,
        broker: data.broker,
        datePurchased: data.datePurchased || undefined,
      });
      onClose();
      return;
    }

    const holdingId = await addHolding({
      symbol: data.symbol.toUpperCase(),
      yahooSymbol: data.yahooSymbol,
      name: data.name,
      exchange: data.exchange,
      instrumentType: data.instrumentType,
      quantity: data.quantity,
      averageBuyPrice: data.averageBuyPrice,
      targetPrice: data.targetPrice,
      broker: data.broker,
      datePurchased: data.datePurchased || undefined,
    });

    if (holdingId) {
      await addTransaction({
        holdingId,
        symbol: data.symbol.toUpperCase(),
        type: "BUY",
        quantity: data.quantity,
        price: data.averageBuyPrice,
        fees: 0,
        broker: data.broker,
        date: data.datePurchased || toLocalDateKey(new Date()),
        notes: "Initial import",
        orderStatus: "executed",
      });
      await completeOnboarding();
      onClose();
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingHolding ? "Edit Holding" : "Add Existing Holding"} className="sm:max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField id="holding-exchange" label="Exchange" error={errors.exchange?.message}>
            <select id="holding-exchange" {...register("exchange")} className={fieldClass}>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="US">US</option>
            </select>
          </FormField>
          <FormField id="holding-type" label="Instrument Type" error={errors.instrumentType?.message}>
            <select id="holding-type" {...register("instrumentType")} className={fieldClass}>
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
            </select>
          </FormField>
        </div>

        <FormField id="holding-symbol" label="Symbol" error={errors.symbol?.message}>
          <SymbolSearchInput
            value={watch("symbol")}
            onSelect={onSelectSymbol}
          />
        </FormField>

        <input type="hidden" {...register("yahooSymbol")} />
        <input type="hidden" {...register("name")} />

        <div className="grid grid-cols-2 gap-4">
          <FormField id="holding-qty" label="Quantity" error={errors.quantity?.message}>
            <input id="holding-qty" type="number" step="0.001" {...register("quantity", { valueAsNumber: true })} className={fieldClass} />
          </FormField>
          <FormField id="holding-avg" label="Average Buy Price" error={errors.averageBuyPrice?.message}>
            <input id="holding-avg" type="number" step="0.01" {...register("averageBuyPrice", { valueAsNumber: true })} className={fieldClass} />
          </FormField>
        </div>

        <FormField id="holding-target" label="Target Price" optional error={errors.targetPrice?.message}>
          <input
            id="holding-target"
            type="number"
            step="0.01"
            placeholder="Alert when price reaches this"
            {...register("targetPrice", {
              setValueAs: (value) => (value === "" ? undefined : Number(value)),
            })}
            className={fieldClass}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="holding-broker" label="Broker (optional)" optional error={errors.broker?.message}>
            <select id="holding-broker" {...register("broker")} className={fieldClass}>
              <option value="">Select broker</option>
              <option value="Groww">Groww</option>
              <option value="Zerodha">Zerodha</option>
              <option value="Upstox">Upstox</option>
              <option value="Angel One">Angel One</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
          <FormField id="holding-date" label="Date Purchased" optional error={errors.datePurchased?.message}>
            <input id="holding-date" type="date" {...register("datePurchased")} className={fieldClass} />
          </FormField>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {editingHolding ? "Save Changes" : "Save Holding"}
        </Button>
      </form>
    </Modal>
  );
}
