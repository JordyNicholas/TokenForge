import { charge } from "./payments.js";
import { loadSettings } from "./config-loader.js";

const settings = loadSettings();

export function handleCheckout(amountCents) {
  return charge(amountCents, settings.currency);
}

console.log(handleCheckout(1999));
