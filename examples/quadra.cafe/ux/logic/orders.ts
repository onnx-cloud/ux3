// Order calculations for UX3
export const calculateOrderTotals = (items: any[], taxRate: number = 0.08) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  return { subtotal, tax, total };
};

export const estimatePreparationTime = (items: any[]) => {
  const maxTime = Math.max(...items.map(i => i.preparationTime || 15));
  return maxTime + 2; // Add 2 minutes for plating
};

export const handleCancellation = (order: any) => {
  const cancellableStates = ['created', 'confirmed'];
  if (!cancellableStates.includes(order.status)) {
    throw new Error(`Cannot cancel order in ${order.status} state`);
  }
  
  if (order.paymentStatus === 'completed') {
    return { refund: order.total };
  }
  
  return { refund: 0 };
};
