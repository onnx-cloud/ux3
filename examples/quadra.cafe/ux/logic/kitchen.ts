/**
 * quadra.cafe kitchen view logic
 * Guard and action functions for kitchen (KDS) FSM
 */

import type { ActionFn } from '@ux3/ux3';

export const onTicketReceived: ActionFn<any> = (ctx, event) => {
  if (event.ticket) {
    ctx.tickets.push(event.ticket);
  }
};

export const startTicketPrep: ActionFn<any> = (ctx, event) => {
  if (event.ticketId) {
    const idx = ctx.tickets.findIndex((t: any) => t.id === event.ticketId);
    if (idx >= 0) {
      ctx.tickets[idx].status = 'in_progress';
    }
  }
};

export const markTicketReady: ActionFn<any> = (ctx, event) => {
  if (event.ticketId) {
    const idx = ctx.tickets.findIndex((t: any) => t.id === event.ticketId);
    if (idx >= 0) {
      ctx.tickets[idx].status = 'ready';
    }
  }
};

export const filterByStation: ActionFn<any> = (ctx, event) => {
  if (event.station) {
    ctx.stationsFilter = event.station;
  }
};

export const setPriorityHigh: ActionFn<any> = (ctx, event) => {
  if (ctx.selectedTicket) {
    ctx.selectedTicket.priority = 'high';
  }
};
