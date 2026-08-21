import { describe, expect, it } from "vitest";

import {
  getClosedBillingCycle,
  planCreditCardBillJobs,
  toLocalDateKey,
} from "../../netlify/functions/_ccBills/core";

describe("getClosedBillingCycle", () => {
  it("closes on the 20th with a non-overlapping Jul 21 → Aug 20 window", () => {
    const { cycleStart, cycleEnd } = getClosedBillingCycle(
      20,
      new Date(2026, 7, 21)
    );
    expect(toLocalDateKey(cycleStart)).toBe("2026-07-21");
    expect(toLocalDateKey(cycleEnd)).toBe("2026-08-20");
  });
});

describe("planCreditCardBillJobs", () => {
  const account = { id: "cc-slice", typeId: "t-credit", billGenerationDay: 20 };
  const typeNameById = new Map([["t-credit", "Credit Card"]]);

  it("creates a gross statement on close day even if the app never opened", () => {
    const { drafts } = planCreditCardBillJobs({
      accounts: [account],
      typeNameById,
      expenses: [
        { accountId: "cc-slice", date: "2026-07-21", amount: 10000 },
        { accountId: "cc-slice", date: "2026-08-19", amount: 17875 },
      ],
      existingBills: [],
      today: "2026-08-20",
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      accountId: "cc-slice",
      statementAmount: 27875,
      statementDate: "2026-08-20",
      billingPeriodStart: "2026-07-21",
      billingPeriodEnd: "2026-08-20",
      dueDate: "2026-08-25",
    });
  });

  it("does not create a bill before the close date", () => {
    const { drafts } = planCreditCardBillJobs({
      accounts: [account],
      typeNameById,
      expenses: [{ accountId: "cc-slice", date: "2026-08-05", amount: 500 }],
      existingBills: [],
      today: "2026-08-19",
    });
    expect(drafts).toEqual([]);
  });

  it("skips a statement that already exists", () => {
    const { drafts, patches } = planCreditCardBillJobs({
      accounts: [account],
      typeNameById,
      expenses: [{ accountId: "cc-slice", date: "2026-08-05", amount: 500 }],
      existingBills: [
        {
          id: "bill-1",
          accountId: "cc-slice",
          statementDate: "2026-08-20",
          statementAmount: 500,
          billingPeriodStart: "2026-07-21",
          billingPeriodEnd: "2026-08-20",
          note: "Auto-created from cycle spend",
          amountPaid: 0,
          status: "UPCOMING",
        },
      ],
      today: "2026-08-21",
    });
    expect(drafts).toEqual([]);
    expect(patches).toEqual([]);
  });

  it("re-dates a drifted auto bill in place", () => {
    const { drafts, patches } = planCreditCardBillJobs({
      accounts: [account],
      typeNameById,
      expenses: [{ accountId: "cc-slice", date: "2026-08-05", amount: 6000 }],
      existingBills: [
        {
          id: "bill-old",
          accountId: "cc-slice",
          statementDate: "2026-08-21",
          statementAmount: 17764,
          billingPeriodStart: "2026-07-21",
          billingPeriodEnd: "2026-08-21",
          note: "Auto-created from cycle spend",
          amountPaid: 0,
          status: "UPCOMING",
        },
      ],
      today: "2026-08-21",
    });
    expect(drafts).toEqual([]);
    expect(patches).toEqual([
      {
        billId: "bill-old",
        statementAmount: 6000,
        minimumDueAmount: 300,
        statementDate: "2026-08-20",
        billingPeriodStart: "2026-07-21",
        billingPeriodEnd: "2026-08-20",
        dueDate: "2026-08-25",
      },
    ]);
  });
});
