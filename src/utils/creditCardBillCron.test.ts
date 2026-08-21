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

  it("creates month-end cards on the last day of that month without a second cron", () => {
    const typeNameById = new Map([
      ["t-credit", "Credit Card"],
    ]);
    const { drafts } = planCreditCardBillJobs({
      accounts: [
        { id: "cc-20", typeId: "t-credit", billGenerationDay: 20 },
        { id: "cc-30", typeId: "t-credit", billGenerationDay: 30 },
        { id: "cc-31", typeId: "t-credit", billGenerationDay: 31 },
      ],
      typeNameById,
      expenses: [
        { accountId: "cc-20", date: "2026-07-21", amount: 10 },
        { accountId: "cc-30", date: "2026-07-31", amount: 300 },
        { accountId: "cc-30", date: "2026-08-30", amount: 30 },
        { accountId: "cc-31", date: "2026-08-01", amount: 310 },
        { accountId: "cc-31", date: "2026-08-31", amount: 1 },
      ],
      existingBills: [
        {
          id: "already-20",
          accountId: "cc-20",
          statementDate: "2026-08-20",
          statementAmount: 10,
          billingPeriodStart: "2026-07-21",
          billingPeriodEnd: "2026-08-20",
          note: "Auto-created from cycle spend",
          status: "UPCOMING",
        },
      ],
      today: "2026-08-31",
    });

    const byCard = Object.fromEntries(drafts.map((d) => [d.accountId, d]));
    expect(byCard["cc-20"]).toBeUndefined();
    expect(byCard["cc-30"]).toMatchObject({
      statementDate: "2026-08-30",
      billingPeriodStart: "2026-07-31",
      billingPeriodEnd: "2026-08-30",
      statementAmount: 330,
    });
    expect(byCard["cc-31"]).toMatchObject({
      statementDate: "2026-08-31",
      billingPeriodStart: "2026-08-01",
      billingPeriodEnd: "2026-08-31",
      statementAmount: 311,
    });
  });

  it("clamps a 31st card to 28 Feb and does not invent a 30/31 Feb statement", () => {
    const { drafts } = planCreditCardBillJobs({
      accounts: [{ id: "cc-eom", typeId: "t-credit", billGenerationDay: 31 }],
      typeNameById: new Map([["t-credit", "Credit Card"]]),
      expenses: [{ accountId: "cc-eom", date: "2026-02-10", amount: 500 }],
      existingBills: [],
      today: "2026-02-28",
    });
    expect(drafts[0]).toMatchObject({
      statementDate: "2026-02-28",
      billingPeriodStart: "2026-02-01",
      billingPeriodEnd: "2026-02-28",
      dueDate: "2026-03-05",
    });
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
