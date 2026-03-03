import { FSMRegistry } from '../../../src/fsm/registry';
// simple fixture helpers for IAM scenarios
export function setAuthToken({ token, userId }) {
    const fsm = FSMRegistry.get('authFSM');
    if (fsm && typeof fsm.updateContext === 'function') {
        fsm.updateContext({ token, userId });
    }
    else if (fsm && typeof fsm.getContext === 'function') {
        // fallback: directly mutate ctx if available
        const ctx = fsm.getContext();
        Object.assign(ctx, { token, userId });
    }
}
export function clearAuth() {
    const fsm = FSMRegistry.get('authFSM');
    if (fsm && typeof fsm.updateContext === 'function') {
        fsm.updateContext({ token: null, userId: null });
    }
}
//# sourceMappingURL=fixtures.js.map