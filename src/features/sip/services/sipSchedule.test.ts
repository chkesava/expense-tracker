import { describe, expect, it } from "vitest";
import {
  computeFollowingExecutionDate,
  computeNextExecutionDate,
  executionDayLabel,
  frequencyLabel,
  isExecutionDue,
} from "./sipSchedule";

const monthlyPlan = {
  frequency: "monthly" as const,
  executionDay: 10,
  startDate: "2026-01-01",
  endDate: undefined as string | undefined,
};

describe("computeNextExecutionDate", () => {
  it("returns same day for daily", () => {
    expect(
      computeNextExecutionDate(
        { frequency: "daily", executionDay: 0, startDate: "2026-01-01" },
        "2026-03-15"
      )
    ).toBe("2026-03-15");
  });

  it("finds next Friday for weekly", () => {
    // 2026-07-31 is Friday
    expect(
      computeNextExecutionDate(
        { frequency: "weekly", executionDay: 5, startDate: "2026-01-01" },
        "2026-07-31"
      )
    ).toBe("2026-07-31");
    // Saturday → next Friday
    expect(
      computeNextExecutionDate(
        { frequency: "weekly", executionDay: 5, startDate: "2026-01-01" },
        "2026-08-01"
      )
    ).toBe("2026-08-07");
  });

  it("schedules monthly on the 10th", () => {
    expect(computeNextExecutionDate(monthlyPlan, "2026-07-05")).toBe("2026-07-10");
    expect(computeNextExecutionDate(monthlyPlan, "2026-07-10")).toBe("2026-07-10");
    expect(computeNextExecutionDate(monthlyPlan, "2026-07-11")).toBe("2026-08-10");
  });

  it("uses last day of month when executionDay is 31", () => {
    expect(
      computeNextExecutionDate(
        { frequency: "monthly", executionDay: 31, startDate: "2026-01-01" },
        "2026-02-01"
      )
    ).toBe("2026-02-28");
  });

  it("returns null when past endDate", () => {
    expect(
      computeNextExecutionDate(
        { ...monthlyPlan, endDate: "2026-06-30" },
        "2026-07-01"
      )
    ).toBeNull();
  });

  it("does not schedule before startDate", () => {
    expect(
      computeNextExecutionDate(
        { frequency: "monthly", executionDay: 10, startDate: "2026-09-01" },
        "2026-07-01"
      )
    ).toBe("2026-09-10");
  });
});

describe("computeFollowingExecutionDate", () => {
  it("advances past the given date", () => {
    expect(computeFollowingExecutionDate(monthlyPlan, "2026-07-10")).toBe("2026-08-10");
  });
});

describe("isExecutionDue", () => {
  const base = {
    status: "active" as const,
    nextExecutionDate: "2026-07-31",
    startDate: "2026-01-01",
    endDate: undefined as string | undefined,
    skipNextExecution: false,
  };

  it("is due when nextExecutionDate <= today", () => {
    expect(isExecutionDue(base, "2026-07-31")).toBe(true);
    expect(isExecutionDue(base, "2026-08-01")).toBe(true);
    expect(isExecutionDue(base, "2026-07-30")).toBe(false);
  });

  it("is not due when paused", () => {
    expect(isExecutionDue({ ...base, status: "paused" }, "2026-07-31")).toBe(false);
  });

  it("is not due before start or after end", () => {
    expect(isExecutionDue({ ...base, startDate: "2026-08-01" }, "2026-07-31")).toBe(false);
    expect(
      isExecutionDue({ ...base, endDate: "2026-07-01" }, "2026-07-31")
    ).toBe(false);
  });
});

describe("labels", () => {
  it("formats frequency and execution day", () => {
    expect(frequencyLabel("monthly")).toBe("Monthly");
    expect(executionDayLabel("daily", 0)).toBe("Every day");
    expect(executionDayLabel("weekly", 5)).toBe("Every Friday");
    expect(executionDayLabel("monthly", 31)).toBe("Last day of month");
    expect(executionDayLabel("monthly", 10)).toBe("10th of month");
  });
});
