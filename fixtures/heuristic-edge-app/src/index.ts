import type { Order } from "./generated/graphql/types";

/** Control file: small, active source that should stay in the keep-set. */
export function totalOf(order: Order): number {
  return order.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
}
