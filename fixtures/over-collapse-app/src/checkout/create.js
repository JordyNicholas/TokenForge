export function createCheckout(order) {
  if (!order || !Array.isArray(order.items)) {
    throw new Error('checkout requires an items array');
  }
  const total = order.items.reduce((sum, item) => sum + item.price, 0);
  return { id: order.id, total };
}
