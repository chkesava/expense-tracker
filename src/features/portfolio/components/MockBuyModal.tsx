import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/common/Modal";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import { mockBuySchema, type MockBuyInput } from "../schemas";
import { useHoldings } from "../hooks/useHoldings";
import { usePortfolioTransactions } from "../hooks/usePortfolioTransactions";
import { usePortfolioSettings } from "../hooks/usePortfolioSettings";
import { usePortfolioOrders } from "../hooks/usePortfolioOrders";
import type { HoldingWithMetrics } from "../types";
import { fieldClass } from "../utils/styles";
import { toLocalDateKey } from "../../../utils/dates";

interface MockBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: HoldingWithMetrics | null;
}

export default function MockBuyModal({ isOpen, onClose, holding }: MockBuyModalProps) {
  const { applyBuyToHolding } = useHoldings();
  const { addTransaction } = usePortfolioTransactions();
  const { settings, updateCashBalance } = usePortfolioSettings();
  const { addOrder } = usePortfolioOrders();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MockBuyInput>({
    resolver: zodResolver(mockBuySchema),
    defaultValues: {
      quantity: 1,
      price: 0,
      targetPrice: 0,
      orderType: "MARKET",
      fees: 0,
      date: toLocalDateKey(new Date()),
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen && holding) {
      reset({
        quantity: 1,
        price: holding.currentPrice,
        targetPrice: holding.currentPrice * 0.95, // Default target 5% below
        orderType: "MARKET",
        fees: 0,
        date: toLocalDateKey(new Date()),
        notes: "",
      });
    }
  }, [isOpen, holding, reset]);

  const quantity = watch("quantity");
  const price = watch("price");
  const targetPrice = watch("targetPrice");
  const orderType = watch("orderType");
  const fees = watch("fees");
  
  const effectivePrice = orderType === "LIMIT" ? targetPrice : price;
  const totalCost = (Number(quantity) || 0) * (Number(effectivePrice) || 0) + (Number(fees) || 0);

  const onSubmit = handleSubmit(async (data) => {
    if (!holding) return;

    const cash = settings?.cashBalance ?? 0;
    if (totalCost > cash) {
      return;
    }

    if (data.orderType === "LIMIT") {
      if (!data.targetPrice) return;
      await addOrder({
        holdingId: holding.id,
        symbol: holding.symbol,
        yahooSymbol: holding.yahooSymbol,
        name: holding.name,
        exchange: holding.exchange,
        instrumentType: holding.instrumentType,
        type: "BUY",
        orderType: "LIMIT",
        quantity: data.quantity,
        targetPrice: data.targetPrice,
        status: "pending",
        broker: data.broker,
        notes: data.notes,
      });
    } else {
      await addTransaction({
        holdingId: holding.id,
        symbol: holding.symbol,
        type: "BUY",
        quantity: data.quantity,
        price: data.price,
        fees: data.fees,
        broker: data.broker,
        date: data.date,
        notes: data.notes,
        orderStatus: "executed",
      });

      await applyBuyToHolding(holding.id, data.quantity, data.price);
      await updateCashBalance(cash - totalCost);
    }
    onClose();
  });

  if (!holding) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mock Buy — ${holding.symbol}`}>
      <p className="text-xs text-amber-500 font-medium mb-4">
        Paper trade only. No real order is placed.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField id="buy-order-type" label="Order Type" error={errors.orderType?.message}>
          <select id="buy-order-type" {...register("orderType")} className={fieldClass}>
            <option value="MARKET">Market (Execute Now)</option>
            <option value="LIMIT">Limit (Target Price)</option>
          </select>
        </FormField>
        <FormField id="buy-qty" label="Quantity" error={errors.quantity?.message}>
          <input id="buy-qty" type="number" step="0.001" {...register("quantity", { valueAsNumber: true })} className={fieldClass} />
        </FormField>
        
        {orderType === "LIMIT" ? (
          <FormField id="buy-target-price" label="Target Price" error={errors.targetPrice?.message}>
            <input id="buy-target-price" type="number" step="0.01" {...register("targetPrice", { valueAsNumber: true })} className={fieldClass} />
          </FormField>
        ) : (
          <FormField id="buy-price" label="Market Price" error={errors.price?.message}>
            <input id="buy-price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} className={fieldClass} />
          </FormField>
        )}

        <FormField id="buy-broker" label="Broker" optional error={errors.broker?.message}>
          <select id="buy-broker" {...register("broker")} className={fieldClass}>
            <option value="">Select broker</option>
            <option value="Groww">Groww</option>
            <option value="Zerodha">Zerodha</option>
            <option value="Upstox">Upstox</option>
            <option value="Angel One">Angel One</option>
          </select>
        </FormField>
        <FormField id="buy-date" label="Date" error={errors.date?.message}>
          <input id="buy-date" type="date" {...register("date")} className={fieldClass} />
        </FormField>
        <FormField id="buy-fees" label="Fees" error={errors.fees?.message}>
          <input id="buy-fees" type="number" step="0.01" {...register("fees", { valueAsNumber: true })} className={fieldClass} />
        </FormField>
        <FormField id="buy-notes" label="Notes" optional error={errors.notes?.message}>
          <textarea id="buy-notes" {...register("notes")} rows={2} className={fieldClass} />
        </FormField>

        <div className="text-sm font-medium">
          Total: ₹{totalCost.toFixed(2)} · Cash: ₹{(settings?.cashBalance ?? 0).toFixed(2)}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || totalCost > (settings?.cashBalance ?? 0)}
        >
          {orderType === "LIMIT" ? "Place Limit Order" : "Execute Mock Buy"}
        </Button>
      </form>
    </Modal>
  );
}
