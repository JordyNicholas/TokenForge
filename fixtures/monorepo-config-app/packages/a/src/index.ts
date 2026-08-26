import Decimal from "decimal.js";

/** Control: real source, genuinely distinct per package. */
export function totalWithTax(amount: string, rate: string): string {
  return new Decimal(amount).times(new Decimal(rate).plus(1)).toFixed(2);
}
