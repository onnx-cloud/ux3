import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Store } from '@ux3/plugin-store';

describe('Store - Bundle Adapter', () => {
  let store: Store;

  beforeEach(async () => {
    store = new Store({
      backend: 'bundle',
      bundle: {
        key: 'agentic.prompts',
        version: '1.0.0',
        metadata: { source: 'plugin-agentic' }
      }
    });
    await store.connect();
  });

  afterEach(async () => {
    await store.disconnect();
  });

  it('creates and retrieves an item', async () => {
    const created = await store.create('plans', { title: 'Test Plan' });
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();

    const fetched = await store.findOne('plans', created.id);
    expect(fetched).toEqual(created);
  });

  it('returns a serializable bundle payload', async () => {
    await store.create('prompts', { name: 'think', description: 'A prompt' });
    const result = store.bundle();

    expect(result.bundleKey).toBe('agentic.prompts');
    expect(result.version).toBe('1.0.0');
    expect(result.metadata).toEqual({ source: 'plugin-agentic' });
    expect(result.models.prompts).toHaveLength(1);
    expect(result.models.prompts[0].name).toBe('think');
  });
});
