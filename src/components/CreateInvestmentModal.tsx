import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import Modal from "./common/Modal";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useInvestments, type CreateInvestmentInput } from "../hooks/useInvestments";
import { db } from "../firebase";
import { getAccountKind } from "../utils/accountKind";
import { monthFromDateKey, todayDateKey } from "../utils/dates";
import type {
  InterestCreditFrequency,
  InterestMethod,
  InvestmentKind,
} from "../types/investment";
import { cn } from "../lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function CreateInvestmentModal({ isOpen, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { addInvestment } = useInvestments();

  const [kind, setKind] = useState<InvestmentKind>("fixed_deposit");
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState(todayDateKey());
  const [annualRate, setAnnualRate] = useState("");
  const [interestMethod, setInterestMethod] = useState<InterestMethod>("simple");
  const [creditFrequency, setCreditFrequency] = useState<InterestCreditFrequency>("monthly");
  const [maturityDate, setMaturityDate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [recordExpense, setRecordExpense] = useState(true);
  const [units, setUnits] = useState("");
  const [purchaseNav, setPurchaseNav] = useState("");
  const [currentNav, setCurrentNav] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const reset = () => {
    setKind("fixed_deposit");
    setName("");
    setPrincipal("");
    setStartDate(todayDateKey());
    setAnnualRate("");
    setInterestMethod("simple");
    setCreditFrequency("monthly");
    setMaturityDate("");
    setLinkedAccountId("");
    setRecordExpense(true);
    setUnits("");
    setPurchaseNav("");
    setCurrentNav("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !name.trim()) {
      toast.error("Enter a name");
      return;
    }

    let principalAmount = 0;
    if (kind === "mutual_fund") {
      principalAmount = mfPrincipal;
      if (principalAmount <= 0) {
        toast.error("Enter valid units and purchase NAV");
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
    let fundingExpenseId: string | undefined;

    try {
      if (recordExpense && linkedAccountId) {
        const expenseAmount = principalAmount;
        const month = monthFromDateKey(startDate);
        const ref = await addDoc(collection(db, "users", user.uid, "expenses"), {
          amount: expenseAmount,
          date: startDate,
          category: "Other",
          note: `Investment: ${name.trim()}`,
          month,
          accountId: linkedAccountId,
          createdAt: serverTimestamp(),
        });
        fundingExpenseId = ref.id;
      }

      const payload: CreateInvestmentInput = {
        name: name.trim(),
        kind,
        principal: principalAmount,
        startDate,
        status: "active",
        linkedAccountId: linkedAccountId || undefined,
        fundingExpenseId,
      };

      if (kind === "mutual_fund") {
        payload.units = Number(units);
        payload.purchaseNav = Number(purchaseNav);
        const nav = currentNav ? Number(currentNav) : Number(purchaseNav);
        payload.currentNav = nav;
        payload.lastNavUpdated = currentNav ? todayDateKey() : undefined;
      } else {
        payload.annualInterestRate = Number(annualRate);
        payload.interestMethod = interestMethod;
        payload.creditFrequency = creditFrequency;
        if (maturityDate) payload.maturityDate = maturityDate;
      }

      const id = await addInvestment(payload);
      if (id) {
        reset();
        onClose();
        onSuccess?.();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save investment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add investment">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
            Type
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as InvestmentKind)}
            className={cn(fieldClass, "cursor-pointer")}
          >
            <option value="fixed_deposit">Fixed deposit</option>
            <option value="interest_savings">Interest savings</option>
            <option value="mutual_fund">Mutual fund</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HDFC FD 2026"
            className={fieldClass}
          />
        </div>

        {kind === "mutual_fund" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Units
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Purchase NAV
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={purchaseNav}
                  onChange={(e) => setPurchaseNav(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            {mfPrincipal > 0 && (
              <p className="text-xs text-muted-foreground">
                Invested amount: ₹{mfPrincipal.toLocaleString()}
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                Current NAV (optional)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentNav}
                onChange={(e) => setCurrentNav(e.target.value)}
                placeholder="Same as purchase if blank"
                className={fieldClass}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                Principal amount
              </label>
              <input
                type="number"
                min="0"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Annual rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Interest type
                </label>
                <select
                  value={interestMethod}
                  onChange={(e) => setInterestMethod(e.target.value as InterestMethod)}
                  className={cn(fieldClass, "cursor-pointer")}
                >
                  <option value="simple">Simple</option>
                  <option value="compound">Compound</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                Interest credited
              </label>
              <select
                value={creditFrequency}
                onChange={(e) => setCreditFrequency(e.target.value as InterestCreditFrequency)}
                className={cn(fieldClass, "cursor-pointer")}
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly (month-end)</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="at_maturity">At maturity only</option>
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Simple monthly: annual rate ÷ 12 credited at each month-end. Compound daily: balance
                grows every day at the effective annual rate.
              </p>
            </div>
            {kind === "fixed_deposit" && (
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Maturity date (optional)
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
            Fund from account
          </label>
          <select
            value={linkedAccountId}
            onChange={(e) => {
              setLinkedAccountId(e.target.value);
              setRecordExpense(!!e.target.value);
            }}
            className={cn(fieldClass, "cursor-pointer")}
          >
            <option value="">None</option>
            {fundableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {linkedAccountId && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recordExpense}
              onChange={(e) => setRecordExpense(e.target.checked)}
              className="rounded border-border"
            />
            Record expense on linked account (reduces bank balance)
          </label>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Add investment"}
        </button>
      </div>
    </Modal>
  );
}
