import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Store } from '@ux3/plugin-store';
import { MemoryAdapter } from '@ux3/plugin-store';

describe('Store - Memory Adapter', () => {
  let store: Store;

  beforeEach(async () => {
    store = new Store({
      backend: 'memory',
      seedData: {
        users: [
          { id: '1', name: 'Alice', email: 'alice@example.com', created: Date.now() },
          { id: '2', name: 'Bob', email: 'bob@example.com', created: Date.now() }
        ]
      }
    });
    await store.connect();
  });

  afterEach(async () => {
    await store.disconnect();
  });

  describe('create', () => {
    it('should create a new item', async () => {
      const item = await store.create('users', {
        name: 'Charlie',
        email: 'charlie@example.com'
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.name).toBe('Charlie');
    });

    it('should emit create event', async () => {
      const changes: any[] = [];
      store.subscribe('users', (change) => {
        changes.push(change);
      });

      await store.create('users', { name: 'David', email: 'david@example.com' });

      expect(changes.length).toBe(1);
      expect(changes[0].op).toBe('create');
    });
  });

  describe('find', () => {
    it('should find all items', async () => {
      const items = await store.find('users');
      expect(items.length).toBe(2);
    });

    it('should find items with filter', async () => {
      const items = await store.find('users', { name: 'Alice' });
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Alice');
    });

    it('should find items with sort', async () => {
      const items = await store.find('users', {}, [{ field: 'name', dir: 'asc' }]);
      expect(items[0].name).toBe('Alice');
      expect(items[1].name).toBe('Bob');
    });
  });

  describe('findOne', () => {
    it('should find single item by id', async () => {
      const item = await store.findOne('users', '1');
      expect(item).toBeDefined();
      expect(item.name).toBe('Alice');
    });

    it('should return undefined for missing item', async () => {
      const item = await store.findOne('users', 'nonexistent');
      expect(item).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update an existing item', async () => {
      const updated = await store.update('users', '1', { name: 'Alicia' });
      expect(updated.name).toBe('Alicia');

      const fetched = await store.findOne('users', '1');
      expect(fetched.name).toBe('Alicia');
    });

    it('should emit update event', async () => {
      const changes: any[] = [];
      store.subscribe('users', (change) => {
        changes.push(change);
      });

      await store.update('users', '1', { name: 'Alicia' });

      expect(changes.length).toBe(1);
      expect(changes[0].op).toBe('update');
      expect(changes[0].before.name).toBe('Alice');
      expect(changes[0].after.name).toBe('Alicia');
    });

    it('should throw if item does not exist', async () => {
      await expect(store.update('users', 'nonexistent', { name: 'Nobody' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete an item', async () => {
      await store.delete('users', '1');

      const item = await store.findOne('users', '1');
      expect(item).toBeUndefined();
    });

    it('should emit delete event', async () => {
      const changes: any[] = [];
      store.subscribe('users', (change) => {
        changes.push(change);
      });

      await store.delete('users', '1');

      expect(changes.length).toBe(1);
      expect(changes[0].op).toBe('delete');
    });
  });

  describe('upsert', () => {
    it('should update if exists', async () => {
      const result = await store.upsert('users', '1', { name: 'Alicia' });
      expect(result.name).toBe('Alicia');
    });

    it('should create if does not exist', async () => {
      const result = await store.upsert('users', '999', { name: 'Emma', email: 'emma@example.com' });
      expect(result.id).toBe('999');
      expect(result.name).toBe('Emma');
    });
  });

  describe('transaction', () => {
    it('should execute multiple operations atomically', async () => {
      const result = await store.transaction([
        { method: 'create', model: 'users', data: { name: 'Frank', email: 'frank@example.com' } },
        { method: 'update', model: 'users', id: '1', data: { name: 'Alicia' } },
        { method: 'delete', model: 'users', id: '2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);

      const users = await store.find('users');
      expect(users.length).toBe(2); // Created 1, deleted 1 = original 2 - 1 + 1
    });
  });

  describe('bulk operations', () => {
    it('should create multiple items', async () => {
      const items = await store.bulkCreate('users', [
        { name: 'Grace', email: 'grace@example.com' },
        { name: 'Henry', email: 'henry@example.com' }
      ]);

      expect(items.length).toBe(2);
      const all = await store.find('users');
      expect(all.length).toBe(4);
    });

    it('should update multiple items', async () => {
      const updates = new Map([
        ['1', { email: 'alice.new@example.com' }],
        ['2', { email: 'bob.new@example.com' }]
      ]);

      const results = await store.bulkUpdate('users', updates);
      expect(results.length).toBe(2);

      const alice = await store.findOne('users', '1');
      expect(alice.email).toBe('alice.new@example.com');
    });
  });

  describe('dump', () => {
    it('should dump all data for a model', async () => {
      const dump = await store.dump('users');
      expect(dump.users).toBeDefined();
      expect(dump.users.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear a model', async () => {
      await store.clear('users');
      const items = await store.find('users');
      expect(items.length).toBe(0);
    });
  });
});
