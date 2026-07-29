import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, TrendingUp, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingStep1Schema, type OnboardingStep1Input } from "../schemas";
import { usePortfolioSettings } from "../hooks/usePortfolioSettings";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import { fieldClass } from "../utils/styles";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { saveOnboarding, completeOnboarding } = usePortfolioSettings();
  const [step, setStep] = useState(1);
  const [hasHoldings, setHasHoldings] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStep1Input>({
    resolver: zodResolver(onboardingStep1Schema),
    defaultValues: { initialInvestmentAmount: 50000 },
  });

  const onStep1 = handleSubmit(async (data) => {
    setSaving(true);
    const ok = await saveOnboarding({
      initialInvestmentAmount: data.initialInvestmentAmount,
    });
    setSaving(false);
    if (ok) setStep(2);
  });

  const finish = async (ownsHoldings: boolean) => {
    setHasHoldings(ownsHoldings);
    setSaving(true);
    await saveOnboarding({ hasExistingHoldings: ownsHoldings });
    if (!ownsHoldings) await completeOnboarding();
    setSaving(false);
    onComplete();
  };

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bento-card p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp size={28} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Portfolio Setup</h2>
          <p className="text-sm text-muted-foreground">
            Paper trading only — no real orders are placed.
          </p>
        </div>

        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= s ? "bg-emerald-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={onStep1}
              className="space-y-6"
            >
              <FormField
                id="initial-investment"
                label="Initial Investment Amount"
                hint="Cash available for mock investing"
                error={errors.initialInvestmentAmount?.message}
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    ₹
                  </span>
                  <input
                    id="initial-investment"
                    type="number"
                    step="0.01"
                    {...register("initialInvestmentAmount", { valueAsNumber: true })}
                    className={`${fieldClass} pl-8`}
                  />
                </div>
              </FormField>
              <Button type="submit" className="w-full" disabled={saving}>
                Continue <ArrowRight size={16} className="ml-2" />
              </Button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <p className="text-center font-medium">
                Do you already own investments?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => finish(true)}
                  className="bento-card p-6 text-center hover:ring-2 hover:ring-emerald-500/50 transition-all active:scale-95"
                >
                  <Wallet className="mx-auto mb-2 text-emerald-500" size={24} />
                  <span className="font-bold">Yes</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Import holdings manually
                  </p>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => finish(false)}
                  className="bento-card p-6 text-center hover:ring-2 hover:ring-primary/50 transition-all active:scale-95"
                >
                  <TrendingUp className="mx-auto mb-2 text-primary" size={24} />
                  <span className="font-bold">No</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start fresh
                  </p>
                </button>
              </div>
              {hasHoldings !== null && saving && (
                <p className="text-center text-sm text-muted-foreground">Saving...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
