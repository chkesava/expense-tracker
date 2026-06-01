import { describe, expect, it } from "vitest";
import type { Account, AccountPayment } from "../types/expense";
import { buildAccountActivities, computeBankBalance } from "./accountBalance";

describe("account activity ledger", () => {
  it("shows the final running balance on the first row when same-day activity exists", () => {
    const account: Account = {
      id: "bank-1",
      name: "Bank",
      typeId: "bank-type",
      openingBalance: 1000,
      balanceInitialized: true,
      balanceAsOfDate: "2026-06-01",
    };
    const payments: AccountPayment[] = [
      {
        id: "payment-1",
        fromAccountId: "bank-1",
        toAccountId: "card-1",
        amount: 200,
        date: "2026-06-01",
        sourceType: "account",
      },
    ];
    const entries = [
      {
        id: "entry-1",
        accountId: "bank-1",
        amount: 100,
        direction: "debit" as const,
        date: "2026-06-01",
      },
    ];

    const currentBalance = computeBankBalance(account, [], [], payments, entries);
    const activities = buildAccountActivities(
      account,
      "Bank",
      [],
      [],
      payments,
      entries
    );

    expect(currentBalance).toBe(700);
    expect(activities[0]?.runningBalance).toBe(currentBalance);
    expect(activities.map((activity) => activity.id)).toEqual([
      "payment-1",
      "entry-entry-1",
    ]);
  });
});
