import { add, multiply } from "./math.js";

export function summarizeOrder(quantity, unitPrice) {
  const subtotal = multiply(quantity, unitPrice);
  const total = add(subtotal, 0);
  return { quantity, unitPrice, total };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(summarizeOrder(3, 19.99));
}
