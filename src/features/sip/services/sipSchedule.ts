import { parseLocalDate, toLocalDateKey } from "../../../utils/dates";
import type { SipFrequency, SipPlan } from "../types";

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function resolveMonthDay(year: number, monthIndex: number, executionDay: number): number {
  if (executionDay === 31) return lastDayOfMonth(year, monthIndex);
  return Math.min(executionDay, lastDayOfMonth(year, monthIndex));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Next calendar date on/after `from` matching weekly weekday. */
function nextWeekly(from: Date, weekday: number): Date {
  const d = new Date(from);
  const delta = (weekday - d.getDay() + 7) % 7;
  return addDays(d, delta);
}

/** Next monthly (or multi-month) occurrence on/after `from`. */
function nextNMonthly(from: Date, executionDay: number, everyMonths: number): Date {
  let year = from.getFullYear();
  let month = from.getMonth();
  for (let i = 0; i < 48; i++) {
    const day = resolveMonthDay(year, month, executionDay);
    const candidate = new Date(year, month, day);
    if (candidate >= from) return candidate;
    month += everyMonths;
    while (month > 11) {
      month -= 12;
      year += 1;
    }
  }
  return from;
}

function nextYearly(from: Date, executionDay: number, startDate: string): Date {
  const start = parseLocalDate(startDate);
  const month = start.getMonth();
  let year = from.getFullYear();
  for (let i = 0; i < 10; i++) {
    const day = resolveMonthDay(year, month, executionDay);
    const candidate = new Date(year, month, day);
    if (candidate >= from) return candidate;
    year += 1;
  }
  return from;
}

export function computeNextExecutionDate(
  plan: Pick<SipPlan, "frequency" | "executionDay" | "startDate" | "endDate">,
  fromDateKey: string
): string | null {
  const from = parseLocalDate(fromDateKey);
  let next: Date;

  switch (plan.frequency as SipFrequency) {
    case "daily":
      next = from;
      break;
    case "weekly":
      next = nextWeekly(from, plan.executionDay);
      break;
    case "monthly":
      next = nextNMonthly(from, plan.executionDay, 1);
      break;
    case "quarterly":
      next = nextNMonthly(from, plan.executionDay, 3);
      break;
    case "yearly":
      next = nextYearly(from, plan.executionDay, plan.startDate);
      break;
    default:
      next = from;
  }

  // Must not be before startDate
  const start = parseLocalDate(plan.startDate);
  if (next < start) {
    return computeNextExecutionDate(plan, plan.startDate);
  }

  const key = toLocalDateKey(next);
  if (plan.endDate && key > plan.endDate) return null;
  return key;
}

/** Advance to the occurrence strictly after `afterDateKey`. */
export function computeFollowingExecutionDate(
  plan: Pick<SipPlan, "frequency" | "executionDay" | "startDate" | "endDate">,
  afterDateKey: string
): string | null {
  const after = parseLocalDate(afterDateKey);
  const nextDay = toLocalDateKey(addDays(after, 1));
  return computeNextExecutionDate(plan, nextDay);
}

export function isExecutionDue(
  plan: Pick<
    SipPlan,
    | "status"
    | "nextExecutionDate"
    | "startDate"
    | "endDate"
    | "skipNextExecution"
  >,
  todayKey: string
): boolean {
  if (plan.status !== "active") return false;
  if (todayKey < plan.startDate) return false;
  if (plan.endDate && todayKey > plan.endDate) return false;
  if (!plan.nextExecutionDate) return false;
  return plan.nextExecutionDate <= todayKey;
}

export function frequencyLabel(frequency: SipFrequency): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
  }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function executionDayLabel(frequency: SipFrequency, executionDay: number): string {
  if (frequency === "daily") return "Every day";
  if (frequency === "weekly") return `Every ${WEEKDAYS[executionDay] ?? "day"}`;
  if (executionDay === 31) return "Last day of month";
  const suffix =
    executionDay === 1 || executionDay === 21
      ? "st"
      : executionDay === 2 || executionDay === 22
        ? "nd"
        : executionDay === 3 || executionDay === 23
          ? "rd"
          : "th";
  return `${executionDay}${suffix} of month`;
}
