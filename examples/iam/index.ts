import { hydrate } from './app.js';
import { config } from './generated/config.js';

// Development console helpers
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__iam = {
    fsm: (name: string) => (window as any).__iamApp?.machines?.[name],
    send: (fsm: string, event: string, payload?: any) =>
      (window as any).__iamApp?.machines?.[fsm]?.send(event, payload),
    state: (fsm: string) => (window as any).__iamApp?.machines?.[fsm]?.getState(),
    context: (fsm: string) => (window as any).__iamApp?.machines?.[fsm]?.getContext(),
  };
}

async function boot() {
  try {
    await hydrate(config, {
      recoverState: true,
      reattachListeners: true,
      reconnectServices: true,
      validateVersion: true,
    });
    console.log('[IAM] ✓ App hydrated');
  } catch (error) {
    console.error('[IAM] Hydration failed:', error);
    // Fallback: full initialize + mount
    const { initializeApp, mountApp } = await import('./app.js');
    await initializeApp();
    await mountApp('#app');
  }
}

// expose a generic entrypoint so runtime injection can call it
if (typeof window !== 'undefined') {
  (window as any).initApp = boot;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
