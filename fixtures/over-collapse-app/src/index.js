import { createCheckout } from './checkout/create.js';
import { formatMoney } from './util/money.js';

export function main(order) {
  return formatMoney(createCheckout(order).total);
}
