import { SAVED_PERCENT_DIGITS } from "./calculator";

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(SAVED_PERCENT_DIGITS)}%`;
}

export function formatTokens(value: number): string {
  return value.toLocaleString("en-US");
}
