import { createStore, type Store } from './store.js';

export interface DataContextConfig<T extends Record<string, any>> {
  key: string;
  seed: () => T;
  actions?: Record<string, (state: T, payload: any) => T>;
}

function loadPersisted<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return null;
}

export function defineDataContext<T extends Record<string, any>>(config: DataContextConfig<T>) {
  const seed = config.seed();
  const whitelist = Object.keys(seed) as (keyof T)[];

  const store: Store<T> = createStore({
    state(): T {
      const persisted = loadPersisted<T>(config.key);
      return (persisted ?? seed) as T;
    },
    persist: {
      key: config.key,
      whitelist,
    },
  });

  const actions: Record<string, any> = {};
  if (config.actions) {
    for (const [name, fn] of Object.entries(config.actions)) {
      actions[name] = (_ctx: any, event: any) => {
        const current = store.getState() as T;
        const cloned = structuredClone(current) as T;
        const next = fn(cloned, event?.payload || {});
        store.patch(() => next);
        return next;
      };
    }
  }

  return {
    store,
    load: async () => {
      const state = store.getState() as T & { loaded?: boolean; error?: string | null };
      return { ...state, loaded: true, error: null };
    },
    actions,
  };
}
