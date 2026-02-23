/**
 * UX3 Store Plugin
 * Reactive state management (Pinia/Zustand style)
 */

export type Listener<T> = (state: T) => void;
export type FieldListener<V> = (value: V) => void;
export type Mutation<T> = (state: T) => void;
export type Action<T> = (context: { state: T; commit: (fn: Mutation<T>) => void }) => void | Promise<void>;
export type StorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export interface StoreConfig<T> {
  state: T | (() => T);
  mutations?: Record<string, Mutation<T>>;
  actions?: Record<string, Action<T>>;
  persist?: {
    key: string;
    adapter?: StorageAdapter;
    whitelist?: (keyof T)[];
  };
}

/**
 * Reactive store for state management
 */
export class Store<T extends Record<string, any>> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();
  private fieldListeners: Map<keyof T, Set<FieldListener<any>>> = new Map();
  private mutations: Record<string, Mutation<T>>;
  private actions: Record<string, Action<T>>;
  private persistConfig: StoreConfig<T>['persist'];
  private storageAdapter: StorageAdapter;

  constructor(config: StoreConfig<T>) {
    this.state = typeof config.state === 'function' ? config.state() : { ...config.state };
    this.mutations = config.mutations || {};
    this.actions = config.actions || {};
    this.persistConfig = config.persist;
    this.storageAdapter = config.persist?.adapter || this.createLocalStorageAdapter();

    if (config.persist) {
      this.loadPersistedState();
    }
  }

  /**
   * Get current state
   */
  getState(): Readonly<T> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Update state (synchronous mutation)
   */
  commit(mutationName: string, ...args: any[]): void {
    // Keep args in signature for API compatibility; mark as used
    void args;
    const mutation = this.mutations[mutationName];
    if (!mutation) {
      throw new Error(`Mutation not found: ${mutationName}`);
    }

    mutation(this.state);
    this.notifyListeners();
  }

  /**
   * Dispatch action (asynchronous)
   */
  async dispatch(actionName: string, ...args: any[]): Promise<any> {
    // Keep args in signature for API compatibility; mark as used
    void args;
    const action = this.actions[actionName];
    if (!action) {
      throw new Error(`Action not found: ${actionName}`);
    }

    return action({
      state: this.state,
      commit: (fn) => {
        fn(this.state);
        this.notifyListeners();
      },
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to specific field changes
   */
  subscribeField<K extends keyof T>(field: K, listener: FieldListener<T[K]>): () => void {
    if (!this.fieldListeners.has(field)) {
      this.fieldListeners.set(field, new Set());
    }

    const listeners = this.fieldListeners.get(field)!;
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(this.getState());
    });

    // Notify field listeners for changed fields
    this.fieldListeners.forEach((listeners, field) => {
      listeners.forEach((listener) => {
        listener(this.state[field]);
      });
    });

    // Persist if configured
    if (this.persistConfig) {
      this.persistState();
    }
  }

  /**
   * Update nested state
   */
  setState(path: string, value: any): void {
    const parts = path.split('.');
    let current: any = this.state;

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
    this.notifyListeners();
  }

  /**
   * Get nested state
   */
  getStateValue(path: string): any {
    const parts = path.split('.');
    let current: any = this.state;

    for (const part of parts) {
      current = current[part];
    }

    return current;
  }

  /**
   * Reset store to initial state
   */
  reset(initialState: T): void {
    this.state = { ...initialState };
    this.notifyListeners();
  }

  /**
   * Create LocalStorage adapter
   */
  private createLocalStorageAdapter(): StorageAdapter {
    if (typeof localStorage === 'undefined') {
      // Fallback for server-side rendering
      return {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      };
    }

    return {
      getItem: async (key: string) => localStorage.getItem(key),
      setItem: async (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: async (key: string) => localStorage.removeItem(key),
    };
  }

  /**
   * Load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    if (!this.persistConfig) return;

    try {
      const stored = await this.storageAdapter.getItem(this.persistConfig.key);
      if (stored) {
        const data = JSON.parse(stored);
        this.state = { ...this.state, ...data };
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  /**
   * Persist state
   */
  private async persistState(): Promise<void> {
    if (!this.persistConfig) return;

    try {
      const toPersist: any = {};
      const whitelist = this.persistConfig.whitelist;

      if (whitelist) {
        whitelist.forEach((key) => {
          toPersist[key] = this.state[key];
        });
      } else {
        Object.assign(toPersist, this.state);
      }

      await this.storageAdapter.setItem(
        this.persistConfig.key,
        JSON.stringify(toPersist)
      );
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
}

/**
 * Create a new store
 */
export function createStore<T extends Record<string, any>>(config: StoreConfig<T>): Store<T> {
  return new Store(config);
}

/**
 * Composable store hooks for Alpine.js
 */
export function createStoreHook<T extends Record<string, any>>(store: Store<T>) {
  return {
    state: store.getState(),
    subscribe: store.subscribe.bind(store),
    commit: store.commit.bind(store),
    dispatch: store.dispatch.bind(store),
    setState: store.setState.bind(store),
    getStateValue: store.getStateValue.bind(store),
  };
}
