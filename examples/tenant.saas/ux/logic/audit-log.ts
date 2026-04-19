/**
 * tenant.saas audit-log view logic
 * Guard and action functions for audit log FSM
 */

import type { ActionFn } from '@ux3/ux3';

export const onAuditLoaded: ActionFn<any> = (ctx, event) => {
  if (event.events) {
    ctx.events = event.events;
  }
};

export const applyAuditFilters: ActionFn<any> = (ctx, event) => {
  if (event.filters) {
    ctx.filters = event.filters;
  }
};

export const onAuditExported: ActionFn<any> = (ctx, event) => {
  // Trigger download of CSV file
  if (event.data) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(event.data));
    element.setAttribute('download', `audit-log-${new Date().toISOString()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
};

export const onExportError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to export audit log';
};
