/** @file Tiny checkout surface for the hybrid-eval-app fixture. */
export function createCheckout(totalCents) {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError("totalCents must be a non-negative integer");
  }
  return { id: "chk_fixture", totalCents, currency: "USD" };
}
