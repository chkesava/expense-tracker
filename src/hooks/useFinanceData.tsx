import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "react-toastify";
import { db } from "../firebase";
import type { Account, AccountEntry, AccountPayment, AccountType, Expense, Income } from "../types/expense";
import { isValidDateKey } from "../utils/dates";
import { useAuth } from "./useAuth";

type FinanceDataContextType = {
  expenses: Expense[];
  expensesLoading: boolean;
  incomes: Income[];
  incomesLoading: boolean;
  accounts: Account[];
  accountsLoading: boolean;
  accountTypes: AccountType[];
  accountTypesLoading: boolean;
  payments: AccountPayment[];
  paymentsLoading: boolean;
  entries: AccountEntry[];
  entriesLoading: boolean;
  addAccount: (
    name: string,
    typeId: string,
    extras?: Partial<Omit<Account, "id" | "name" | "typeId" | "createdAt">>
  ) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addAccountType: (name: string) => Promise<void>;
  deleteAccountType: (id: string) => Promise<void>;
  addPayment: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    note?: string,
    opts?: { appliedCycleStart?: string; appliedCycleEnd?: string }
  ) => Promise<boolean>;
  addExternalPayment: (
    toAccountId: string,
    amount: number,
    date: string,
    note?: string,
    opts?: { appliedCycleStart?: string; appliedCycleEnd?: string }
  ) => Promise<boolean>;
  deletePayment: (id: string) => Promise<void>;
  addEntry: (
    accountId: string,
    amount: number,
    direction: "credit" | "debit",
    date: string,
    note?: string
  ) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<void>;
};

const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined);

function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomesLoading, setIncomesLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [accountTypesLoading, setAccountTypesLoading] = useState(true);
  const [payments, setPayments] = useState<AccountPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setIncomes([]);
      setAccounts([]);
      setAccountTypes([]);
      setPayments([]);
      setEntries([]);
      setExpensesLoading(false);
      setIncomesLoading(false);
      setAccountsLoading(false);
      setAccountTypesLoading(false);
      setPaymentsLoading(false);
      setEntriesLoading(false);
      return;
    }

    setExpensesLoading(true);
    setIncomesLoading(true);
    setAccountsLoading(true);
    setAccountTypesLoading(true);
    setPaymentsLoading(true);
    setEntriesLoading(true);

    const base = ["users", user.uid] as const;
    const unsubscribers = [
      onSnapshot(
        query(collection(db, ...base, "expenses"), orderBy("createdAt", "desc")),
        (snap) => {
          setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
          setExpensesLoading(false);
        },
        (error) => {
          console.error("Error fetching expenses:", error);
          setExpensesLoading(false);
        }
      ),
      onSnapshot(
        query(collection(db, ...base, "incomes"), orderBy("createdAt", "desc")),
        (snap) => {
          setIncomes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Income)));
          setIncomesLoading(false);
        },
        (error) => {
          console.error("Error fetching incomes:", error);
          setIncomesLoading(false);
        }
      ),
      onSnapshot(
        query(collection(db, ...base, "accounts")),
        (snap) => {
          setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Account)));
          setAccountsLoading(false);
        },
        (error) => {
          console.error("useAccounts snapshot error:", error);
          setAccountsLoading(false);
        }
      ),
      onSnapshot(
        query(collection(db, ...base, "accountTypes")),
        (snap) => {
          setAccountTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountType)));
          setAccountTypesLoading(false);
        },
        (error) => {
          console.error("useAccountTypes snapshot error:", error);
          setAccountTypesLoading(false);
        }
      ),
      onSnapshot(
        query(collection(db, ...base, "accountPayments")),
        (snap) => {
          setPayments(sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountPayment))));
          setPaymentsLoading(false);
        },
        (error) => {
          console.error("useAccountPayments snapshot error:", error);
          setPaymentsLoading(false);
        }
      ),
      onSnapshot(
        query(collection(db, ...base, "accountEntries")),
        (snap) => {
          setEntries(sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountEntry))));
          setEntriesLoading(false);
        },
        (error) => {
          console.error("useAccountEntries snapshot error:", error);
          setEntriesLoading(false);
        }
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const value = useMemo<FinanceDataContextType>(() => {
    const addAccount = async (
      name: string,
      typeId: string,
      extras?: Partial<Omit<Account, "id" | "name" | "typeId" | "createdAt">>
    ) => {
      if (!user || !name.trim() || !typeId) return;
      try {
        const payload: Record<string, unknown> = {
          name: name.trim(),
          typeId,
          createdAt: serverTimestamp(),
        };
        if (extras?.billGenerationDay != null) payload.billGenerationDay = extras.billGenerationDay;
        if (extras?.creditLimit != null) payload.creditLimit = extras.creditLimit;
        if (extras?.openingBalance != null) payload.openingBalance = extras.openingBalance;
        if (extras?.balanceInitialized != null) payload.balanceInitialized = extras.balanceInitialized;
        if (extras?.balanceAsOfDate != null) payload.balanceAsOfDate = extras.balanceAsOfDate;
        await addDoc(collection(db, "users", user.uid, "accounts"), payload);
        toast.success("Account added");
      } catch (err) {
        console.error(err);
        toast.error("Failed to add account");
      }
    };

    const updateAccount = async (id: string, updates: Partial<Account>) => {
      if (!user) return;
      try {
        const { id: _, createdAt, ...validUpdates } = updates as any;
        await updateDoc(doc(db, "users", user.uid, "accounts", id), validUpdates);
        toast.success("Account updated");
      } catch (err) {
        console.error(err);
        toast.error("Failed to update account");
      }
    };

    const deleteAccount = async (id: string) => {
      if (!user) return;
      try {
        const base = ["users", user.uid] as const;
        const [
          linkedExpensesSnap,
          linkedIncomesSnap,
          linkedEntriesSnap,
          linkedPaymentsFromSnap,
          linkedPaymentsToSnap,
        ] = await Promise.all([
          getDocs(query(collection(db, ...base, "expenses"), where("accountId", "==", id))),
          getDocs(query(collection(db, ...base, "incomes"), where("accountId", "==", id))),
          getDocs(query(collection(db, ...base, "accountEntries"), where("accountId", "==", id))),
          getDocs(query(collection(db, ...base, "accountPayments"), where("fromAccountId", "==", id))),
          getDocs(query(collection(db, ...base, "accountPayments"), where("toAccountId", "==", id))),
        ]);

        const linkedCount =
          linkedExpensesSnap.size +
          linkedIncomesSnap.size +
          linkedEntriesSnap.size +
          linkedPaymentsFromSnap.size +
          linkedPaymentsToSnap.size;

        if (linkedCount > 0) {
          toast.error(`Cannot delete account. ${linkedCount} linked records exist. Move/unlink transactions first.`);
          return;
        }

        await deleteDoc(doc(db, "users", user.uid, "accounts", id));
        toast.success("Account deleted");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete account");
      }
    };

    const addAccountType = async (name: string) => {
      if (!user || !name.trim()) return;
      try {
        await addDoc(collection(db, "users", user.uid, "accountTypes"), {
          name: name.trim(),
          createdAt: serverTimestamp(),
        });
        toast.success("Account type added");
      } catch (err) {
        console.error(err);
        toast.error("Failed to add account type");
      }
    };

    const deleteAccountType = async (id: string) => {
      if (!user) return;
      try {
        await deleteDoc(doc(db, "users", user.uid, "accountTypes", id));
        toast.success("Account type deleted");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete account type");
      }
    };

    const addPayment = async (
      fromAccountId: string,
      toAccountId: string,
      amount: number,
      date: string,
      note?: string,
      opts?: { appliedCycleStart?: string; appliedCycleEnd?: string }
    ) => {
      if (!user || !fromAccountId || !toAccountId || amount <= 0) return false;
      if (fromAccountId === toAccountId) {
        toast.error("Source and destination accounts must differ");
        return false;
      }
      if (!isValidDateKey(date)) {
        toast.error("Invalid payment date");
        return false;
      }
      try {
        await addDoc(collection(db, "users", user.uid, "accountPayments"), {
          fromAccountId,
          toAccountId,
          amount,
          date,
          note: note?.trim() || "",
          sourceType: "account",
          ...(opts?.appliedCycleStart ? { appliedCycleStart: opts.appliedCycleStart } : {}),
          ...(opts?.appliedCycleEnd ? { appliedCycleEnd: opts.appliedCycleEnd } : {}),
          createdAt: serverTimestamp(),
        });
        toast.success("Bill payment recorded");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Failed to record payment");
        return false;
      }
    };

    const addExternalPayment = async (
      toAccountId: string,
      amount: number,
      date: string,
      note?: string,
      opts?: { appliedCycleStart?: string; appliedCycleEnd?: string }
    ) => {
      if (!user || !toAccountId || amount <= 0) return false;
      if (!isValidDateKey(date)) {
        toast.error("Invalid payment date");
        return false;
      }
      try {
        await addDoc(collection(db, "users", user.uid, "accountPayments"), {
          fromAccountId: "external",
          toAccountId,
          amount,
          date,
          note: note?.trim() || "",
          sourceType: "external",
          ...(opts?.appliedCycleStart ? { appliedCycleStart: opts.appliedCycleStart } : {}),
          ...(opts?.appliedCycleEnd ? { appliedCycleEnd: opts.appliedCycleEnd } : {}),
          createdAt: serverTimestamp(),
        });
        toast.success("Marked as already paid");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Failed to mark as paid");
        return false;
      }
    };

    const deletePayment = async (id: string) => {
      if (!user) return;
      try {
        await deleteDoc(doc(db, "users", user.uid, "accountPayments", id));
        toast.success("Payment removed");
      } catch (err) {
        console.error(err);
        toast.error("Failed to remove payment");
      }
    };

    const addEntry = async (
      accountId: string,
      amount: number,
      direction: "credit" | "debit",
      date: string,
      note?: string
    ) => {
      if (!user || !accountId || amount <= 0 || !date) {
        toast.error("Enter a valid amount and date");
        return false;
      }
      if (!isValidDateKey(date)) {
        toast.error("Invalid entry date");
        return false;
      }
      try {
        await addDoc(collection(db, "users", user.uid, "accountEntries"), {
          accountId,
          amount,
          direction,
          date,
          note: note?.trim() || "",
          createdAt: serverTimestamp(),
        });
        toast.success(direction === "credit" ? "Funds added to account" : "Debit recorded in account");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Failed to save account entry");
        return false;
      }
    };

    const deleteEntry = async (id: string) => {
      if (!user) return;
      try {
        await deleteDoc(doc(db, "users", user.uid, "accountEntries", id));
        toast.success("Account entry removed");
      } catch (err) {
        console.error(err);
        toast.error("Failed to remove account entry");
      }
    };

    return {
      expenses,
      expensesLoading,
      incomes,
      incomesLoading,
      accounts,
      accountsLoading,
      accountTypes,
      accountTypesLoading,
      payments,
      paymentsLoading,
      entries,
      entriesLoading,
      addAccount,
      updateAccount,
      deleteAccount,
      addAccountType,
      deleteAccountType,
      addPayment,
      addExternalPayment,
      deletePayment,
      addEntry,
      deleteEntry,
    };
  }, [
    user,
    expenses,
    expensesLoading,
    incomes,
    incomesLoading,
    accounts,
    accountsLoading,
    accountTypes,
    accountTypesLoading,
    payments,
    paymentsLoading,
    entries,
    entriesLoading,
  ]);

  return <FinanceDataContext.Provider value={value}>{children}</FinanceDataContext.Provider>;
}

export function useFinanceData() {
  const context = useContext(FinanceDataContext);
  if (!context) {
    throw new Error("useFinanceData must be used within a FinanceDataProvider");
  }
  return context;
}
