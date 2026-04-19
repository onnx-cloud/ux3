/**
 * quadra.cafe order view logic
 * Guard and action functions for order FSM
 */

import type { ActionFn, GuardFn } from '@ux3/ux3';

export const hasOrderItems: GuardFn<any> = (ctx) => {
  return ctx.order?.items?.length > 0;
};

export const selectMenuItem: ActionFn<any> = (ctx, event) => {
  if (event.item) {
    ctx.selectedItems = [event.item];
  }
};

export const addItemToOrder: ActionFn<any> = (ctx, event) => {
  if (ctx.selectedItems && ctx.selectedItems.length > 0) {
    const item = {
      ...ctx.selectedItems[0],
      ...event.customizations,
      quantity: event.quantity || 1
    };
    ctx.order.items.push(item);
    ctx.order.subtotal = ctx.order.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
    ctx.order.tax = ctx.order.subtotal * 0.08;
    ctx.order.total = ctx.order.subtotal + ctx.order.tax;
  }
};

export const onTicketSubmitted: ActionFn<any> = (ctx, event) => {
  ctx.order.status = 'confirmed';
  if (event.estimatedReadyTime) {
    ctx.estimatedReadyTime = event.estimatedReadyTime;
  }
};

export const onSubmitError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to submit order';
};

export const canCancelOrder: GuardFn<any> = (ctx) => {
  const cancellableStates = ['created', 'confirmed'];
  return cancellableStates.includes(ctx.order?.status);
};

export const onPaymentSuccess: ActionFn<any> = (ctx, event) => {
  ctx.order.status = 'paid';
};

export const onPaymentError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Payment failed';
};
