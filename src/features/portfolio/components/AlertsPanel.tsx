import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAlerts } from "../hooks/useAlerts";
import { alertSchema, type AlertInput } from "../schemas";
import SymbolSearchInput from "./SymbolSearchInput";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import type { SearchResult } from "../types";
import { fieldClass } from "../utils/styles";

export default function AlertsPanel() {
  const { alerts, addAlert, toggleAlert, deleteAlert } = useAlerts();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlertInput>({
    resolver: zodResolver(alertSchema),
    defaultValues: { condition: "price_above", threshold: 0 },
  });

  const onSelectSymbol = (result: SearchResult) => {
    setValue("symbol", result.symbol);
    setValue("yahooSymbol", result.yahooSymbol);
    setValue("name", result.name);
  };

  const onSubmit = handleSubmit(async (data) => {
    await addAlert(data);
    reset();
    setShowForm(false);
  });

  const conditionLabel = (c: string) => {
    switch (c) {
      case "price_above":
        return "Price above";
      case "price_below":
        return "Price below";
      case "profit_above":
        return "Profit exceeds";
      case "loss_above":
        return "Loss exceeds";
      default:
        return c;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2">
          <Bell size={18} /> Price Alerts
        </h3>
        <Button onClick={() => setShowForm(!showForm)} className="!min-h-9 !px-3 !py-1.5 !text-xs">
          <Plus size={16} className="mr-1" /> New Alert
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="bento-card p-5 space-y-4">
          <FormField id="alert-symbol" label="Symbol" error={errors.symbol?.message}>
            <SymbolSearchInput value="" onSelect={onSelectSymbol} />
          </FormField>
          <input type="hidden" {...register("symbol")} />
          <input type="hidden" {...register("yahooSymbol")} />
          <input type="hidden" {...register("name")} />
          <div className="grid grid-cols-2 gap-4">
            <FormField id="alert-condition" label="Condition" error={errors.condition?.message}>
              <select id="alert-condition" {...register("condition")} className={fieldClass}>
                <option value="price_above">Price goes above</option>
                <option value="price_below">Price falls below</option>
                <option value="profit_above">Profit exceeds %</option>
                <option value="loss_above">Loss exceeds %</option>
              </select>
            </FormField>
            <FormField id="alert-threshold" label="Threshold" error={errors.threshold?.message}>
              <input id="alert-threshold" type="number" step="0.01" {...register("threshold", { valueAsNumber: true })} className={fieldClass} />
            </FormField>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            Create Alert
          </Button>
        </form>
      )}

      {alerts.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          No alerts configured.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="bento-card p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-bold">{alert.symbol}</div>
                <div className="text-xs text-muted-foreground">
                  {conditionLabel(alert.condition)} ₹{alert.threshold}
                  {alert.condition.includes("profit") || alert.condition.includes("loss")
                    ? "%"
                    : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAlert(alert.id, !alert.isActive)}
                  className={`text-xs font-bold px-3 py-1 rounded-lg ${
                    alert.isActive
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {alert.isActive ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
