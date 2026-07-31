import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/common/Modal";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import SymbolSearchInput from "../../portfolio/components/SymbolSearchInput";
import MutualFundSearchInput from "../../portfolio/components/MutualFundSearchInput";
import { CRYPTO_COINS } from "../../portfolio/data/cryptoCoins";
import { sipPlanFormSchema, type SipPlanFormInput } from "../schemas";
import type { SipPlan, SipAssetType } from "../types";
import type { SearchResult } from "../../portfolio/types";
import type { MutualFundSearchResult } from "../../../services/mutualFundService";
import { cryptoQuoteKey, mfQuoteKey } from "../../../types/market";
import { fieldClass } from "../../portfolio/utils/styles";
import { toLocalDateKey } from "../../../utils/dates";

interface SipPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SipPlanFormInput) => Promise<void>;
  editing?: SipPlan | null;
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const MONTH_DAY_OPTIONS = [
  ...[1, 5, 10, 15, 25].map((d) => ({ value: d, label: `${d}` })),
  { value: 31, label: "Last day of month" },
];

export default function SipPlanModal({
  isOpen,
  onClose,
  onSubmit,
  editing = null,
}: SipPlanModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SipPlanFormInput>({
    resolver: zodResolver(sipPlanFormSchema),
    defaultValues: {
      assetType: "stock",
      symbol: "",
      quoteKey: "",
      assetName: "",
      investmentAmount: 1000,
      currency: "INR",
      frequency: "monthly",
      executionDay: 10,
      startDate: toLocalDateKey(new Date()),
      endDate: "",
    },
  });

  const assetType = watch("assetType");
  const frequency = watch("frequency");

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        assetType: editing.assetType,
        symbol: editing.symbol,
        quoteKey: editing.quoteKey,
        assetName: editing.assetName,
        investmentAmount: editing.investmentAmount,
        currency: editing.currency || "INR",
        frequency: editing.frequency,
        executionDay: editing.executionDay,
        startDate: editing.startDate,
        endDate: editing.endDate ?? "",
      });
    } else {
      reset({
        assetType: "stock",
        symbol: "",
        quoteKey: "",
        assetName: "",
        investmentAmount: 1000,
        currency: "INR",
        frequency: "monthly",
        executionDay: 10,
        startDate: toLocalDateKey(new Date()),
        endDate: "",
      });
    }
  }, [isOpen, editing, reset]);

  useEffect(() => {
    if (frequency === "daily") setValue("executionDay", 0);
    if (frequency === "weekly") setValue("executionDay", 5);
    if (
      (frequency === "monthly" || frequency === "quarterly" || frequency === "yearly") &&
      (watch("executionDay") < 1 || watch("executionDay") > 31)
    ) {
      setValue("executionDay", 10);
    }
  }, [frequency, setValue, watch]);

  const onSelectEquity = (result: SearchResult) => {
    const type: SipAssetType = result.instrumentType === "etf" ? "etf" : "stock";
    setValue("assetType", type);
    setValue("symbol", result.symbol);
    setValue("quoteKey", result.yahooSymbol);
    setValue("assetName", result.name);
  };

  const onSelectFund = (result: MutualFundSearchResult) => {
    setValue("assetType", "mutual_fund");
    setValue("symbol", result.schemeCode);
    setValue("quoteKey", mfQuoteKey(result.schemeCode));
    setValue("assetName", result.schemeName);
  };

  const onSelectCrypto = (coinId: string) => {
    const coin = CRYPTO_COINS.find((c) => c.coinId === coinId);
    if (!coin) return;
    setValue("assetType", "crypto");
    setValue("symbol", coin.coinId);
    setValue("quoteKey", cryptoQuoteKey(coin.coinId));
    setValue("assetName", coin.name);
  };

  const submit = handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      currency: data.currency || "INR",
      endDate: data.endDate || undefined,
    });
    onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit Virtual SIP" : "Create Virtual SIP"}
      className="sm:max-w-xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Simulation only — no real money or broker orders.
        </p>

        <FormField id="sip-type" label="Asset Type" error={errors.assetType?.message}>
          <select
            id="sip-type"
            className={fieldClass}
            value={assetType}
            onChange={(e) => {
              const next = e.target.value as SipAssetType;
              setValue("assetType", next);
              setValue("symbol", "");
              setValue("quoteKey", "");
              setValue("assetName", "");
            }}
          >
            <option value="stock">Stock</option>
            <option value="etf">ETF</option>
            <option value="mutual_fund">Mutual Fund</option>
            <option value="crypto">Crypto</option>
          </select>
        </FormField>

        {(assetType === "stock" || assetType === "etf") && (
          <FormField id="sip-symbol" label="Symbol" error={errors.symbol?.message ?? errors.assetName?.message}>
            <SymbolSearchInput value={watch("symbol")} onSelect={onSelectEquity} />
          </FormField>
        )}

        {assetType === "mutual_fund" && (
          <FormField id="sip-fund" label="Mutual Fund" error={errors.symbol?.message ?? errors.assetName?.message}>
            <MutualFundSearchInput value={watch("assetName") || watch("symbol")} onSelect={onSelectFund} />
          </FormField>
        )}

        {assetType === "crypto" && (
          <FormField id="sip-coin" label="Crypto" error={errors.symbol?.message}>
            <select
              id="sip-coin"
              className={fieldClass}
              value={watch("symbol")}
              onChange={(e) => onSelectCrypto(e.target.value)}
            >
              <option value="">Select a coin</option>
              {CRYPTO_COINS.map((c) => (
                <option key={c.coinId} value={c.coinId}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </FormField>
        )}

        <input type="hidden" {...register("symbol")} />
        <input type="hidden" {...register("quoteKey")} />
        <input type="hidden" {...register("assetName")} />
        <input type="hidden" {...register("currency")} />

        <div className="grid grid-cols-2 gap-4">
          <FormField id="sip-amount" label="Investment Amount (₹)" error={errors.investmentAmount?.message}>
            <input
              id="sip-amount"
              type="number"
              step="1"
              {...register("investmentAmount", { valueAsNumber: true })}
              className={fieldClass}
            />
          </FormField>
          <FormField id="sip-freq" label="Frequency" error={errors.frequency?.message}>
            <select id="sip-freq" {...register("frequency")} className={fieldClass}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </FormField>
        </div>

        {frequency === "weekly" && (
          <FormField id="sip-day" label="Execution Day" error={errors.executionDay?.message}>
            <select
              id="sip-day"
              className={fieldClass}
              value={watch("executionDay")}
              onChange={(e) => setValue("executionDay", Number(e.target.value))}
            >
              {WEEKDAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {(frequency === "monthly" || frequency === "quarterly" || frequency === "yearly") && (
          <FormField id="sip-day" label="Execution Day" error={errors.executionDay?.message}>
            <select
              id="sip-day"
              className={fieldClass}
              value={watch("executionDay")}
              onChange={(e) => setValue("executionDay", Number(e.target.value))}
            >
              {MONTH_DAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField id="sip-start" label="Start Date" error={errors.startDate?.message}>
            <input id="sip-start" type="date" {...register("startDate")} className={fieldClass} />
          </FormField>
          <FormField id="sip-end" label="End Date" optional error={errors.endDate?.message}>
            <input id="sip-end" type="date" {...register("endDate")} className={fieldClass} />
          </FormField>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {editing ? "Save Changes" : "Create SIP"}
        </Button>
      </form>
    </Modal>
  );
}
