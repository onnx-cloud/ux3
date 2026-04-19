// Organization view logic
import type { ActionFn, GuardFn } from '../../../src/fsm/types';

export const canUpgradePlan: GuardFn<any> = (ctx) => {
  return ctx.org.status === 'active' && ctx.org.plan !== 'enterprise';
};

export const hasUnsavedChanges: GuardFn<any> = (ctx) => {
  return ctx.unsavedChanges === true;
};

export const clearChanges: ActionFn<any> = (ctx, _event) => {
  ctx.unsavedChanges = false;
};

export const updateOrgField: ActionFn<any> = (ctx, event) => {
  if (event.field && typeof event.value !== 'undefined') {
    (ctx.org as any)[event.field] = event.value;
    ctx.unsavedChanges = true;
  }
};

export const onUpdateSuccess: ActionFn<any> = (ctx, event) => {
  ctx.org = event.data;
  ctx.unsavedChanges = false;
};

export const onUpdateError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to update organization';
};

export const onPlanUpgradeSuccess: ActionFn<any> = (ctx, event) => {
  ctx.org.plan = event.newPlan;
};

export const onUpgradeError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to upgrade plan';
};

export const onOrgLoaded: ActionFn<any> = (ctx, event) => {
  if (event.data) {
    ctx.org = event.data;
  }
};

export const onLoadError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to load organization';
};
