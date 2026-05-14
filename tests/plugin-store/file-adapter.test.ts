import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Store } from '@ux3/plugin-store';

const TMP_DIR = path.join(process.cwd(), 'tmp', 'plugin-store-file-test');

describe('Store - File Adapter', () => {
  let store: Store;

  beforeEach(async () => {
    await fs.rm(TMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TMP_DIR, { recursive: true });

    store = new Store({
      backend: 'file',
      persistence: {
        dir: TMP_DIR,
        keyPrefix: 'replay:'
      }
    });
    await store.connect();
  });

  afterEach(async () => {
    await store.disconnect();
    await fs.rm(TMP_DIR, { recursive: true, force: true });
  });

  it('should persist and retrieve an item', async () => {
    const item = await store.create('events', { id: '1', type: 'TEST', payload: { hello: 'world' } });
    expect(item.id).toBe('1');

    const fetched = await store.findOne('events', '1');
    expect(fetched).toBeDefined();
    expect(fetched.type).toBe('TEST');
  });

  it('should list items and apply filter', async () => {
    await store.create('events', { id: '1', type: 'A' });
    await store.create('events', { id: '2', type: 'B' });
    const items = await store.find('events', { type: 'B' });
    expect(items.length).toBe(1);
    expect(items[0].type).toBe('B');
  });

  it('should delete items', async () => {
    await store.create('events', { id: '1', type: 'A' });
    await store.delete('events', '1');
    const item = await store.findOne('events', '1');
    expect(item).toBeUndefined();
  });

  it('should respect keyPrefix for file storage', async () => {
    await store.create('events', { id: '1', type: 'A' });
    const files = await fs.readdir(path.join(TMP_DIR, 'events'));
    expect(files).toContain('replay%3A-1.json');
  });
});
