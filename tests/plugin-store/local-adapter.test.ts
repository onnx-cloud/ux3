import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Store } from '@ux3/plugin-store';

describe('LocalAdapter', () => {
  let adapter: any;

  beforeEach(async () => {
    const store = new Store({
      backend: 'local',
      persistence: {
        driver: 'localStorage',
        keyPrefix: 'test:'
      }
    });
    await store.connect();
    adapter = store['adapter'];
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe('basic operations', () => {
    it('should set and get items', async () => {
      await adapter.set('users', '1', { name: 'Alice' });
      const item = await adapter.get('users', '1');
      expect(item.name).toBe('Alice');
    });

    it('should delete items', async () => {
      await adapter.set('users', '1', { name: 'Alice' });
      await adapter.delete('users', '1');
      const item = await adapter.get('users', '1');
      expect(item).toBeUndefined();
    });

    it('should list items', async () => {
      await adapter.set('users', '1', { name: 'Alice' });
      await adapter.set('users', '2', { name: 'Bob' });
      const items = await adapter.list('users');
      expect(items.length).toBe(2);
    });
  });

  describe('batch operations', () => {
    it('should batch set items', async () => {
      await adapter.batchSet([
        ['users', '1', { name: 'Alice' }],
        ['users', '2', { name: 'Bob' }]
      ]);

      const items = await adapter.list('users');
      expect(items.length).toBe(2);
    });

    it('should batch delete items', async () => {
      await adapter.set('users', '1', { name: 'Alice' });
      await adapter.set('users', '2', { name: 'Bob' });
      
      await adapter.batchDelete([
        ['users', '1'],
        ['users', '2']
      ]);

      const items = await adapter.list('users');
      expect(items.length).toBe(0);
    });
  });

  describe('filtering and sorting', () => {
    beforeEach(async () => {
      await adapter.set('tasks', '1', { title: 'Task A', done: false });
      await adapter.set('tasks', '2', { title: 'Task B', done: true });
      await adapter.set('tasks', '3', { title: 'Task C', done: false });
    });

    it('should filter items', async () => {
      const items = await adapter.list('tasks', { done: false });
      expect(items.length).toBe(2);
    });

    it('should sort items', async () => {
      const items = await adapter.list('tasks', {}, [{ field: 'title', dir: 'asc' }]);
      expect(items[0].title).toBe('Task A');
      expect(items[2].title).toBe('Task C');
    });
  });

  describe('metadata', () => {
    it('should set and get metadata', async () => {
      const meta = { version: 1, lastSync: Date.now() };
      await adapter.setMeta('users', meta);
      const retrieved = await adapter.getMeta('users');
      expect(retrieved.version).toBe(1);
    });
  });

  describe('dump', () => {
    it('should dump all data', async () => {
      await adapter.set('users', '1', { name: 'Alice' });
      await adapter.set('posts', '1', { title: 'Post 1' });
      
      const dump = await adapter.dump();
      expect(dump.users).toBeDefined();
      expect(dump.posts).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear a model', async () => {
      await adapter.set('users', '1', { name: 'Alice' });
      await adapter.set('users', '2', { name: 'Bob' });
      
      await adapter.clear('users');
      const items = await adapter.list('users');
      expect(items.length).toBe(0);
    });
  });
});
