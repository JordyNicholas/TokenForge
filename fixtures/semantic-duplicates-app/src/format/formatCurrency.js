export function formatCurrency(amountInCents, currency = "USD") {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}
