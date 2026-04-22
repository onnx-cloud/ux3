import type { FSMContext, FSMEvent } from '@ux3/core';

export function handle[[ Name ]]Open(ctx: FSMContext, event: FSMEvent): FSMContext {
  return {
    ...ctx,
    open: true,
    lastEvent: event.type,
  };
}

export function handle[[ Name ]]Close(ctx: FSMContext, event: FSMEvent): FSMContext {
  return {
    ...ctx,
    open: false,
    lastEvent: event.type,
  };
}