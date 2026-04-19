/**
 * tenant.saas membership view logic
 * Guard and action functions for membership FSM
 */

import type { ActionFn, GuardFn } from '@ux3/ux3';

export const isValidInviteEmail: GuardFn<any> = (ctx, event) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return event.email ? emailRegex.test(event.email) : false;
};

export const onMembersLoaded: ActionFn<any> = (ctx, event) => {
  if (event.members) {
    ctx.members = event.members;
  }
  if (event.pendingInvites) {
    ctx.pendingInvites = event.pendingInvites;
  }
};

export const onInviteSent: ActionFn<any> = (ctx, event) => {
  if (event.invite) {
    ctx.pendingInvites.push(event.invite);
  }
  ctx.newInviteEmail = '';  // Clear the form
};

export const onInviteError: ActionFn<any> = (ctx, event) => {
  ctx.error = event.message || 'Failed to send invitation';
};

export const onRoleUpdated: ActionFn<any> = (ctx, event) => {
  if (ctx.selectedMember && event.newRole) {
    const idx = ctx.members.findIndex((m: any) => m.id === ctx.selectedMember.id);
    if (idx >= 0) {
      ctx.members[idx].role = event.newRole;
    }
  }
};

export const onMemberDeactivated: ActionFn<any> = (ctx, event) => {
  if (ctx.selectedMember) {
    ctx.members = ctx.members.filter((m: any) => m.id !== ctx.selectedMember.id);
  }
};

export const onInviteRevoked: ActionFn<any> = (ctx, event) => {
  if (ctx.selectedMember) {
    ctx.pendingInvites = ctx.pendingInvites.filter((i: any) => i.id !== ctx.selectedMember.id);
  }
};
