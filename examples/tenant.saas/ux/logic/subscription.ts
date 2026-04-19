/**
 * tenant.saas subscription view logic
 * Guard and action functions for subscription FSM
 */

import type { ActionFn } from '@ux3/ux3';

export const onSubscriptionLoaded: ActionFn<any> = (ctx, event) => {
  if (event.subscription) {
    ctx.subscription = event.subscription;
  }
  if (event.paymentMethod) {
    ctx.paymentMethod = event.paymentMethod;
  }
  if (event.invoices) {
    ctx.invoices = event.invoices;
  }
};

export const setNewPlan: ActionFn<any> = (ctx, event) => {
  if (event.plan) {
    ctx.newPlan = event.plan;
  }
};

export const onUpgradeProcessed: ActionFn<any> = (ctx, event) => {
  if (event.data) {
    ctx.subscription = event.data;
  }
};

export const onUpgradeError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to upgrade subscription';
};

export const onDowngradeProcessed: ActionFn<any> = (ctx, event) => {
  if (event.data) {
    ctx.subscription = event.data;
  }
};

export const onDowngradeError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to downgrade subscription';
};

export const onPaymentUpdated: ActionFn<any> = (ctx, event) => {
  if (event.data) {
    ctx.paymentMethod = event.data;
  }
};

export const onPaymentError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to update payment method';
};

export const onSubscriptionCancelled: ActionFn<any> = (ctx, event) => {
  if (ctx.subscription) {
    ctx.subscription.status = 'cancelled';
  }
};

export const onCancellationError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to cancel subscription';
};
