import { FSMRegistry } from '../../../src/fsm/registry';

// simple fixture helpers for IAM scenarios
export function setAuthToken({ token, userId }: { token: string; userId: string }) {
  const fsm = FSMRegistry.get('authFSM');
  if (fsm && typeof (fsm as any).updateContext === 'function') {
    (fsm as any).updateContext({ token, userId });
  } else if (fsm && typeof fsm.getContext === 'function') {
    // fallback: directly mutate ctx if available
    const ctx = fsm.getContext();
    Object.assign(ctx, { token, userId });
  }
}

export function clearAuth() {
  const fsm = FSMRegistry.get('authFSM');
  if (fsm && typeof (fsm as any).updateContext === 'function') {
    (fsm as any).updateContext({ token: null, userId: null });
  }
}
