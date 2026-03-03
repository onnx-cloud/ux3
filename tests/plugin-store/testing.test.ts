import { describe, it, expect, afterEach } from 'vitest';
import { Store } from '@ux3/plugin-store';

describe('Store Testing Utilities', () => {
  describe('createStoreStub', () => {
    it('should create a memory-backed store', async () => {
      const store = new Store({
        backend: 'memory',
        seedData: {
          users: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' }
          ]
        }
      });
      await store.connect();

      const items = await store.find('users');
      expect(items.length).toBe(2);

      await store.disconnect();
    });
  });

  describe('seedStore', () => {
    it('should seed data into store', async () => {
      const store = new Store({ backend: 'memory' });
      await store.connect();
      
      const created = [];
      for (const item of [
        { id: 'p1', name: 'Product 1', price: 10 },
        { id: 'p2', name: 'Product 2', price: 20 }
      ]) {
        const result = await store.create('products', item);
        created.push(result);
      }

      expect(created.length).toBe(2);

      const items = await store.find('products');
      expect(items.length).toBe(2);

      await store.disconnect();
    });
  });

  describe('verifyStoreState', () => {
    it('should verify store has expected count', async () => {
      const store = new Store({
        backend: 'memory',
        seedData: {
          items: [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' }
          ]
        }
      });
      await store.connect();

      const items = await store.find('items');
      const valid = items.length === 2;
      expect(valid).toBe(true);

      await store.disconnect();
    });
  });

  describe('clearStore', () => {
    it('should clear data from store', async () => {
      const store = new Store({
        backend: 'memory',
        seedData: {
          items: [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' }
          ]
        }
      });
      await store.connect();

      await store.clear('items');

      const items = await store.find('items');
      expect(items.length).toBe(0);

      await store.disconnect();
    });
  });
});
