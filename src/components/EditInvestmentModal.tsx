import { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import Modal from "./common/Modal";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useInvestments } from "../hooks/useInvestments";
import { getAccountKind } from "../utils/accountKind";
import { todayDateKey } from "../utils/dates";
import type {
  InterestCreditFrequency,
  InterestMethod,
  Investment,
  InvestmentKind,
} from "../types/investment";
import { cn } from "../lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  investment: Investment;
  onSuccess?: () => void;
};

export default function EditInvestmentModal({ isOpen, onClose, investment, onSuccess }: Props) {
  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { updateInvestment, deleteInvestment } = useInvestments();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [kind, setKind] = useState<InvestmentKind>(investment.kind);
  const [name, setName] = useState(investment.name);
  const [principal, setPrincipal] = useState(String(investment.principal ?? ""));
  const [startDate, setStartDate] = useState(investment.startDate ?? todayDateKey());
  const [annualRate, setAnnualRate] = useState(investment.annualInterestRate != null ? String(investment.annualInterestRate) : "");
  const [interestMethod, setInterestMethod] = useState<InterestMethod>(investment.interestMethod ?? "simple");
  const [creditFrequency, setCreditFrequency] = useState<InterestCreditFrequency>(investment.creditFrequency ?? "monthly");
  const [maturityDate, setMaturityDate] = useState(investment.maturityDate ?? "");
  const [linkedAccountId, setLinkedAccountId] = useState(investment.linkedAccountId ?? "");
  const [units, setUnits] = useState(investment.units != null ? String(investment.units) : "");
  const [purchaseNav, setPurchaseNav] = useState(investment.purchaseNav != null ? String(investment.purchaseNav) : "");
  const [currentNav, setCurrentNav] = useState(investment.currentNav != null ? String(investment.currentNav) : "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (investment) {
      setKind(investment.kind);
      setName(investment.name);
      setPrincipal(String(investment.principal ?? ""));
      setStartDate(investment.startDate ?? todayDateKey());
      setAnnualRate(investment.annualInterestRate != null ? String(investment.annualInterestRate) : "");
      setInterestMethod(investment.interestMethod ?? "simple");
      setCreditFrequency(investment.creditFrequency ?? "monthly");
      setMaturityDate(investment.maturityDate ?? "");
      setLinkedAccountId(investment.linkedAccountId ?? "");
      setUnits(investment.units != null ? String(investment.units) : "");
      setPurchaseNav(investment.purchaseNav != null ? String(investment.purchaseNav) : "");
      setCurrentNav(investment.currentNav != null ? String(investment.currentNav) : "");
    }
  }, [investment]);

  const fundableAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const typeName = accountTypes.find((t) => t.id === acc.typeId)?.name || "";
      return getAccountKind(typeName) !== "credit";
    });
  }, [accounts, accountTypes]);

  const mfPrincipal = useMemo(() => {
    const u = Number(units);
    const nav = Number(purchaseNav);
    if (!Number.isFinite(u) || !Number.isFinite(nav) || u <= 0 || nav <= 0) return 0;
    return u * nav;
  }, [units, purchaseNav]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Enter investment name");
      return;
    }

    let principalAmount = 0;
    if (kind === "mutual_fund") {
      principalAmount = mfPrincipal > 0 ? mfPrincipal : Number(principal) || 0;
      if (principalAmount <= 0) {
        toast.error("Enter valid units and NAV");
        return;
      }
    } else {
      principalAmount = Number(principal);
      if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
        toast.error("Enter a valid amount");
        return;
      }
      const rate = Number(annualRate);
      if (!Number.isFinite(rate) || rate < 0) {
        toast.error("Enter a valid interest rate");
        return;
      }
    }

    setSubmitting(true);

    try {
      const patch: Partial<Investment> = {
        name: name.trim(),
        kind,
        principal: principalAmount,
        startDate,
        linkedAccountId: linkedAccountId || undefined,
        maturityDate: maturityDate || undefined,
      };

      if (kind === "mutual_fund") {
        patch.units = units ? Number(units) : undefined;
        patch.purchaseNav = purchaseNav ? Number(purchaseNav) : undefined;
        if (currentNav) {
          patch.currentNav = Number(currentNav);
          patch.lastNavUpdated = todayDateKey();
        }
      } else {
        patch.annualInterestRate = annualRate ? Number(annualRate) : undefined;
        patch.interestMethod = interestMethod;
        patch.creditFrequency = creditFrequency;
      }

      await updateInvestment(investment.id, patch);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error editing investment:", err);
      toast.error("Failed to update investment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Investment">
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-xs font-bold text-muted-foreground">Type</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(
              [
                ["fixed_deposit", "Fixed deposit"],
                ["interest_savings", "Savings / FD"],
                ["mutual_fund", "Mutual fund"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-xl border py-2 text-xs font-bold transition-all",
                  kind === k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Investment name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HDFC FD, Parag Parikh Flexi Cap"
            className={fieldClass}
          />
        </div>

        {kind === "mutual_fund" ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Units</label>
              <input
                type="number"
                step="any"
                min="0"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="120.45"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Purchase NAV</label>
              <input
                type="number"
                step="any"
                min="0"
                value={purchaseNav}
                onChange={(e) => setPurchaseNav(e.target.value)}
                placeholder="45.50"
                className={fieldClass}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Current NAV (Optional)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={currentNav}
                onChange={(e) => setCurrentNav(e.target.value)}
                placeholder="48.20"
                className={fieldClass}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-muted-foreground">Principal amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="100000"
              className={fieldClass}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          {kind !== "interest_savings" && (
            <div>
              <label className="text-xs font-bold text-muted-foreground">Maturity date (Optional)</label>
              <input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
        </div>

        {kind !== "mutual_fund" && (
          <>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Annual interest rate (%)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                placeholder="7.25"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Interest method</label>
                <select
                  value={interestMethod}
                  onChange={(e) => setInterestMethod(e.target.value as InterestMethod)}
                  className={cn(fieldClass, "cursor-pointer appearance-none")}
                >
                  <option value="simple">Simple interest</option>
                  <option value="compound">Compound (Daily)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Credit frequency</label>
                <select
                  value={creditFrequency}
                  onChange={(e) => setCreditFrequency(e.target.value as InterestCreditFrequency)}
                  className={cn(fieldClass, "cursor-pointer appearance-none")}
                >
                  <option value="monthly">Monthly end</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="at_maturity">At maturity</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-bold text-muted-foreground">Source Account (Optional)</label>
          <select
            value={linkedAccountId}
            onChange={(e) => setLinkedAccountId(e.target.value)}
            className={cn(fieldClass, "cursor-pointer appearance-none")}
          >
            <option value="">None / External</option>
            {fundableAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm(`Delete investment "${investment.name}"?`)) {
                await deleteInvestment(investment.id);
                onSuccess?.();
                onClose();
              }
            }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-xs font-bold text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
