import { createCheckout } from "./checkout.js";

export function main() {
  return createCheckout(1999);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(main());
}
