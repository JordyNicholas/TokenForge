import { UsageError } from "../app/errors";

export type UsagePeriod = {
  /** Canonical key, e.g. `2026-08`. */
  label: string;
  year: number;
  month: number;
  daysInMonth: number;
};

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Parse a billing period key (`YYYY-MM`). */
export function parseUsagePeriod(period: string): UsagePeriod {
  const trimmed = period.trim();
  const match = PERIOD_RE.exec(trimmed);
  if (!match) {
    throw new UsageError(`Invalid usage period "${period}". Expected YYYY-MM.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { label: trimmed, year, month, daysInMonth };
}

/** Calendar days in a billing month as ISO date strings. */
export function daysInUsagePeriod(period: UsagePeriod): string[] {
  const days: string[] = [];
  for (let day = 1; day <= period.daysInMonth; day += 1) {
    days.push(
      `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  return days;
}
