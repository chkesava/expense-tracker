import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/common/Modal";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import { mockSellSchema, type MockSellInput } from "../schemas";
import { useHoldings } from "../hooks/useHoldings";
import { usePortfolioTransactions } from "../hooks/usePortfolioTransactions";
import { usePortfolioSettings } from "../hooks/usePortfolioSettings";
import type { HoldingWithMetrics } from "../types";
import { fieldClass } from "../utils/styles";
import { toLocalDateKey } from "../../../utils/dates";

interface MockSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: HoldingWithMetrics | null;
}

export default function MockSellModal({ isOpen, onClose, holding }: MockSellModalProps) {
  const { applySellToHolding } = useHoldings();
  const { addTransaction } = usePortfolioTransactions();
  const { settings, updateCashBalance } = usePortfolioSettings();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MockSellInput>({
    resolver: zodResolver(mockSellSchema),
    defaultValues: {
      quantity: 1,
      price: 0,
      fees: 0,
      date: toLocalDateKey(new Date()),
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen && holding) {
      reset({
        quantity: Math.min(1, holding.quantity),
        price: holding.currentPrice,
        fees: 0,
        date: toLocalDateKey(new Date()),
        notes: "",
      });
    }
  }, [isOpen, holding, reset]);

  const quantity = Number(watch("quantity")) || 0;
  const price = Number(watch("price")) || 0;
  const fees = Number(watch("fees")) || 0;
  const proceeds = quantity * price - fees;

  const onSubmit = handleSubmit(async (data) => {
    if (!holding || data.quantity > holding.quantity) return;

    await addTransaction({
      holdingId: holding.id,
      symbol: holding.symbol,
      type: "SELL",
      quantity: data.quantity,
      price: data.price,
      fees: data.fees,
      broker: data.broker,
      date: data.date,
      notes: data.notes,
      orderStatus: "executed",
    });

    await applySellToHolding(holding.id, data.quantity);
    await updateCashBalance((settings?.cashBalance ?? 0) + proceeds);
    onClose();
  });

  if (!holding) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mock Sell — ${holding.symbol}`}>
      <p className="text-xs text-amber-500 font-medium mb-4">
        Paper trade only. No real order is placed.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          id="sell-qty"
          label={`Quantity (max ${holding.quantity})`}
          error={errors.quantity?.message}
        >
          <input
            id="sell-qty"
            type="number"
            step="0.001"
            max={holding.quantity}
            {...register("quantity", { valueAsNumber: true })}
            className={fieldClass}
          />
        </FormField>
        <FormField id="sell-price" label="Selling Price" error={errors.price?.message}>
          <input id="sell-price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} className={fieldClass} />
        </FormField>
        <FormField id="sell-broker" label="Broker" optional error={errors.broker?.message}>
          <select id="sell-broker" {...register("broker")} className={fieldClass}>
            <option value="">Select broker</option>
            <option value="Groww">Groww</option>
            <option value="Zerodha">Zerodha</option>
            <option value="Upstox">Upstox</option>
            <option value="Angel One">Angel One</option>
          </select>
        </FormField>
        <FormField id="sell-date" label="Date" error={errors.date?.message}>
          <input id="sell-date" type="date" {...register("date")} className={fieldClass} />
        </FormField>
        <FormField id="sell-fees" label="Fees" error={errors.fees?.message}>
          <input id="sell-fees" type="number" step="0.01" {...register("fees", { valueAsNumber: true })} className={fieldClass} />
        </FormField>
        <FormField id="sell-notes" label="Notes" optional error={errors.notes?.message}>
          <textarea id="sell-notes" {...register("notes")} rows={2} className={fieldClass} />
        </FormField>

        <div className="text-sm font-medium">Proceeds: ₹{proceeds.toFixed(2)}</div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || quantity > holding.quantity || quantity <= 0}
          variant="destructive"
        >
          Execute Mock Sell
        </Button>
      </form>
    </Modal>
  );
}
