import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/common/Modal";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import SymbolSearchInput from "./SymbolSearchInput";
import MutualFundSearchInput from "./MutualFundSearchInput";
import { addHoldingSchema, type AddHoldingInput } from "../schemas";
import { useHoldings } from "../hooks/useHoldings";
import { usePortfolioSettings } from "../hooks/usePortfolioSettings";
import { usePortfolioTransactions } from "../hooks/usePortfolioTransactions";
import type { HoldingWithMetrics, SearchResult } from "../types";
import type { MutualFundSearchResult } from "../../../services/mutualFundService";
import { CRYPTO_COINS } from "../data/cryptoCoins";
import { cryptoQuoteKey, mfQuoteKey } from "../../../types/market";
import { fieldClass } from "../utils/styles";
import { toLocalDateKey } from "../../../utils/dates";
import { toast } from "react-toastify";

type AddableInstrument = "stock" | "etf" | "mutual_fund" | "crypto";

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInstrumentType?: AddableInstrument;
  editingHolding?: HoldingWithMetrics | null;
}

function normalizeInstrument(type: string | undefined, fallback: AddableInstrument): AddableInstrument {
  if (type === "etf" || type === "mutual_fund" || type === "crypto" || type === "stock") return type;
  return fallback;
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

  const instrumentType = watch("instrumentType");
  const isMf = instrumentType === "mutual_fund";
  const isCrypto = instrumentType === "crypto";
  const isEquity = instrumentType === "stock" || instrumentType === "etf";

  useEffect(() => {
    if (isOpen && editingHolding) {
      reset({
        exchange: editingHolding.exchange,
        instrumentType: normalizeInstrument(editingHolding.instrumentType, defaultInstrumentType),
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
        exchange: defaultInstrumentType === "crypto" ? "US" : "NSE",
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

  const onSelectFund = (result: MutualFundSearchResult) => {
    setValue("symbol", result.schemeCode, { shouldValidate: true });
    setValue("yahooSymbol", mfQuoteKey(result.schemeCode));
    setValue("name", result.schemeName);
    setValue("exchange", "NSE");
    setValue("instrumentType", "mutual_fund");
  };

  const onSelectCrypto = (coinId: string) => {
    const coin = CRYPTO_COINS.find((c) => c.coinId === coinId);
    if (!coin) return;
    setValue("symbol", coin.coinId, { shouldValidate: true });
    setValue("yahooSymbol", cryptoQuoteKey(coin.coinId));
    setValue("name", coin.name);
    setValue("exchange", "US");
    setValue("instrumentType", "crypto");
  };

  const onInstrumentChange = (next: AddableInstrument) => {
    setValue("instrumentType", next);
    setValue("symbol", "");
    setValue("yahooSymbol", "");
    setValue("name", "");
    setValue("exchange", next === "crypto" ? "US" : "NSE");
  };

  const onSubmit = handleSubmit(async (data) => {
    const existing = findBySymbol(data.symbol, data.exchange);
    if (existing && existing.id !== editingHolding?.id) {
      toast.info("This holding already exists in your portfolio");
      return;
    }

    const symbol =
      data.instrumentType === "crypto"
        ? data.symbol.trim().toLowerCase()
        : data.instrumentType === "mutual_fund"
          ? data.symbol.trim()
          : data.symbol.toUpperCase();

    const yahooSymbol =
      data.instrumentType === "mutual_fund"
        ? mfQuoteKey(symbol)
        : data.instrumentType === "crypto"
          ? cryptoQuoteKey(symbol)
          : data.yahooSymbol;

    const payload = {
      symbol,
      yahooSymbol,
      name: data.name,
      exchange: data.exchange,
      instrumentType: data.instrumentType,
      quantity: data.quantity,
      averageBuyPrice: data.averageBuyPrice,
      targetPrice: isEquity ? data.targetPrice : undefined,
      broker: data.broker,
      datePurchased: data.datePurchased || undefined,
    };

    if (editingHolding) {
      await updateHolding(editingHolding.id, {
        ...payload,
        targetAlertTriggeredAt:
          data.targetPrice === editingHolding.targetPrice
            ? editingHolding.targetAlertTriggeredAt
            : null,
      });
      onClose();
      return;
    }

    const holdingId = await addHolding(payload);

    if (holdingId) {
      await addTransaction({
        holdingId,
        symbol,
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
          {isEquity && (
            <FormField id="holding-exchange" label="Exchange" error={errors.exchange?.message}>
              <select id="holding-exchange" {...register("exchange")} className={fieldClass}>
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="US">US</option>
              </select>
            </FormField>
          )}
          <FormField
            id="holding-type"
            label="Instrument Type"
            error={errors.instrumentType?.message}
            className={isEquity ? undefined : "col-span-2"}
          >
            <select
              id="holding-type"
              value={instrumentType}
              onChange={(e) => onInstrumentChange(e.target.value as AddableInstrument)}
              className={fieldClass}
            >
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="mutual_fund">Mutual Fund</option>
              <option value="crypto">Crypto</option>
            </select>
          </FormField>
        </div>

        {isEquity && (
          <FormField id="holding-symbol" label="Symbol" error={errors.symbol?.message}>
            <SymbolSearchInput value={watch("symbol")} onSelect={onSelectSymbol} />
          </FormField>
        )}

        {isMf && (
          <FormField id="holding-scheme" label="Mutual Fund Scheme" error={errors.symbol?.message ?? errors.name?.message}>
            <MutualFundSearchInput value={watch("name") || watch("symbol")} onSelect={onSelectFund} />
          </FormField>
        )}

        {isCrypto && (
          <FormField id="holding-coin" label="Crypto Coin" error={errors.symbol?.message ?? errors.name?.message}>
            <select
              id="holding-coin"
              className={fieldClass}
              value={watch("symbol")}
              onChange={(e) => onSelectCrypto(e.target.value)}
            >
              <option value="">Select a coin</option>
              {CRYPTO_COINS.map((coin) => (
                <option key={coin.coinId} value={coin.coinId}>
                  {coin.name} ({coin.symbol})
                </option>
              ))}
            </select>
          </FormField>
        )}

        <input type="hidden" {...register("yahooSymbol")} />
        <input type="hidden" {...register("name")} />
        <input type="hidden" {...register("symbol")} />
        {!isEquity && <input type="hidden" {...register("exchange")} />}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="holding-qty"
            label={isMf ? "Units" : "Quantity"}
            error={errors.quantity?.message}
          >
            <input
              id="holding-qty"
              type="number"
              step="any"
              {...register("quantity", { valueAsNumber: true })}
              className={fieldClass}
            />
          </FormField>
          <FormField
            id="holding-avg"
            label={isMf ? "Average NAV" : "Average Buy Price"}
            error={errors.averageBuyPrice?.message}
          >
            <input
              id="holding-avg"
              type="number"
              step="any"
              {...register("averageBuyPrice", { valueAsNumber: true })}
              className={fieldClass}
            />
          </FormField>
        </div>

        {isEquity && (
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField id="holding-broker" label="Broker" optional error={errors.broker?.message}>
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
