/**
 * quadra.cafe reservation view logic
 * Guard and action functions for reservation FSM
 */

import type { ActionFn } from '@ux3/ux3';

export const onSlotsLoaded: ActionFn<any> = (ctx, event) => {
  if (event.tables) {
    ctx.availableTables = event.tables;
  }
};

export const selectTable: ActionFn<any> = (ctx, event) => {
  if (event.table) {
    ctx.selectedTable = event.table;
  }
};

export const updatePartySize: ActionFn<any> = (ctx, event) => {
  if (event.size) {
    ctx.reservation.partySize = event.size;
  }
};

export const onWaitlistJoined: ActionFn<any> = (ctx, event) => {
  if (event.position !== undefined) {
    ctx.waitlistPosition = event.position;
  }
};

export const onReservationCreated: ActionFn<any> = (ctx, event) => {
  if (event.reservation) {
    ctx.reservation = event.reservation;
  }
};

export const onReservationError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to create reservation';
};
