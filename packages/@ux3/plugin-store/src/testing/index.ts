import { Store } from '../store';
import { MemoryAdapter } from '../adapters/memory';
import type { StoreConfig } from '../types';

/**
 * Create a stub Store for testing
 */
export function createStoreStub(seedData?: Record<string, any[]>): Store {
  const config: StoreConfig = {
    backend: 'memory',
    seedData
  };

  const store = new Store(config);
  store.connect();

  return store;
}

/**
 * Create a hybrid store for testing (with memory backends)
 */
export function createHybridStoreStub(seedData?: Record<string, any[]>): Store {
  const config: StoreConfig = {
    backend: 'memory',
    seedData
  };

  const store = new Store(config);
  store.connect();

  return store;
}

/**
 * Test helper to seed data
 */
export async function seedStore(
  store: Store,
  model: string,
  data: any[]
): Promise<any[]> {
  const created = [];

  for (const item of data) {
    const result = await store.create(model, item);
    created.push(result);
  }

  return created;
}

/**
 * Test helper to verify store state
 */
export async function verifyStoreState(
  store: Store,
  model: string,
  expectedCount: number
): Promise<boolean> {
  const items = await store.find(model);
  return items.length === expectedCount;
}

/**
 * Test helper to clear store
 */
export async function clearStore(store: Store, model?: string): Promise<void> {
  await store.clear(model);
}
