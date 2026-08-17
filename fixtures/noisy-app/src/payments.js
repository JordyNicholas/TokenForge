export function charge(amountCents, currency = "USD") {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive number");
  }

  return {
    ok: true,
    currency,
    amountCents: Math.round(amountCents),
  };
}
