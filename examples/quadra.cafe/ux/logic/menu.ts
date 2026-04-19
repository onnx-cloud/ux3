/**
 * quadra.cafe menu view logic
 * Guard and action functions for menu FSM
 */

import type { ActionFn } from '@ux3/ux3';

export const onMenuLoaded: ActionFn<any> = (ctx, event) => {
  if (event.categories) {
    ctx.categories = event.categories;
  }
  if (event.items) {
    ctx.items = event.items;
  }
};

export const selectItemForEdit: ActionFn<any> = (ctx, event) => {
  if (event.item) {
    ctx.editingItem = event.item;
  }
};

export const onMenuItemSaved: ActionFn<any> = (ctx, event) => {
  if (event.items) {
    ctx.items = event.items;
  }
  ctx.editingItem = null;
  ctx.newItem = {
    name: '',
    description: '',
    price: 0,
    category: '',
    isAvailable: true,
    preparationTime: 0
  };
};

export const toggleItemAvailability: ActionFn<any> = (ctx, event) => {
  if (ctx.editingItem) {
    ctx.editingItem.isAvailable = !ctx.editingItem.isAvailable;
  }
};
