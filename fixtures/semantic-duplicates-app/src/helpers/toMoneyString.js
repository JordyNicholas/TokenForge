export function toMoneyString(cents) {
  const sign = cents < 0 ? "-" : "";
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainder = String(absCents % 100).padStart(2, "0");
  return `${sign}$${dollars.toLocaleString("en-US")}.${remainder}`;
}
