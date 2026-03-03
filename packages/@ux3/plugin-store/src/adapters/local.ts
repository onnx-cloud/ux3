import { BaseAdapter } from './adapter';
import type { StoreConfig, Meta } from '../types';

interface DBSchema {
  [modelName: string]: any[];
}

/**
 * Local adapter - Uses localStorage for simple data and IndexedDB for complex queries
 */
export class LocalAdapter extends BaseAdapter {
  private db: IDBDatabase | null = null;
  private inMemoryFallback: DBSchema = {};
  private isIndexedDBAvailable: boolean;

  constructor(config: StoreConfig) {
    super('local', config);
    this.isIndexedDBAvailable = typeof indexedDB !== 'undefined';
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    if (this.config.persistence?.driver === 'indexeddb' && this.isIndexedDBAvailable) {
      await this.initIndexedDB();
    } else if (this.config.persistence?.driver === 'localStorage' || !this.isIndexedDBAvailable) {
      // localStorage is available, no need to initialize
    }

    // Seed data if provided
    if (this.config.seedData) {
      for (const [model, items] of Object.entries(this.config.seedData)) {
        for (const item of items) {
          await this.set(model, item.id, item);
        }
      }
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.connected = false;
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbName = this.config.persistence?.dbName || 'ux3-store';
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for each model
        for (const model of Object.keys(this.config.models || {})) {
          if (!db.objectStoreNames.contains(model)) {
            const store = db.createObjectStore(model, { keyPath: 'id' });
            
            // Create indexes
            const modelDef = this.config.models?.[model];
            if (modelDef?.indexes) {
              for (const index of modelDef.indexes) {
                const indexName = Array.isArray(index) ? index.join('_') : index;
                const indexKeys = Array.isArray(index) ? index : [index];
                try {
                  store.createIndex(indexName, indexKeys as any);
                } catch (e) {
                  // Index might already exist
                }
              }
            }
          }
        }
      };
    });
  }

  private getStorageKey(model: string, id: any): string {
    const prefix = this.config.persistence?.keyPrefix || 'ux3:';
    return `${prefix}${model}:${JSON.stringify(id)}`;
  }

  async get(model: string, id: any): Promise<any> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction([model], 'readonly');
        const store = tx.objectStore(model);
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } else {
      // Fallback to localStorage
      const key = this.getStorageKey(model, id);
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : undefined;
    }
  }

  async set(model: string, id: any, data: any): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction([model], 'readwrite');
        const store = tx.objectStore(model);
        const request = store.put({ ...data, id });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } else {
      const key = this.getStorageKey(model, id);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  async delete(model: string, id: any): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction([model], 'readwrite');
        const store = tx.objectStore(model);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } else {
      const key = this.getStorageKey(model, id);
      localStorage.removeItem(key);
    }
  }

  async list(model: string, filter?: any, sort?: any[]): Promise<any[]> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction([model], 'readonly');
        const store = tx.objectStore(model);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          let results = request.result || [];
          
          // Apply filter
          if (filter) {
            results = results.filter(item => {
              for (const [key, value] of Object.entries(filter)) {
                if (item[key] !== value) return false;
              }
              return true;
            });
          }
          
          // Apply sort
          if (sort && sort.length > 0) {
            results.sort((a, b) => {
              for (const sortRule of sort) {
                const field = sortRule.field || sortRule;
                const dir = sortRule.dir === 'desc' ? -1 : 1;
                if (a[field] < b[field]) return -dir;
                if (a[field] > b[field]) return dir;
              }
              return 0;
            });
          }
          
          resolve(results);
        };
      });
    } else {
      // Fallback to localStorage
      const prefix = this.config.persistence?.keyPrefix || 'ux3:';
      const modelPrefix = `${prefix}${model}:`;
      const results = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(modelPrefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              results.push(JSON.parse(item));
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      // Apply filter and sort
      if (filter) {
        return results.filter(item => {
          for (const [key, value] of Object.entries(filter)) {
            if (item[key] !== value) return false;
          }
          return true;
        }).sort((a, b) => {
          if (sort && sort.length > 0) {
            for (const sortRule of sort) {
              const field = sortRule.field || sortRule;
              const dir = sortRule.dir === 'desc' ? -1 : 1;
              if (a[field] < b[field]) return -dir;
              if (a[field] > b[field]) return dir;
            }
          }
          return 0;
        });
      }
      
      if (sort && sort.length > 0) {
        results.sort((a, b) => {
          for (const sortRule of sort) {
            const field = sortRule.field || sortRule;
            const dir = sortRule.dir === 'desc' ? -1 : 1;
            if (a[field] < b[field]) return -dir;
            if (a[field] > b[field]) return dir;
          }
          return 0;
        });
      }
      
      return results;
    }
  }

  async batchSet(ops: Array<[model: string, id: any, data: any]>): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const models = new Set(ops.map(([m]) => m));
        const tx = this.db!.transaction(Array.from(models), 'readwrite');
        let completed = 0;

        for (const [model, id, data] of ops) {
          const store = tx.objectStore(model);
          const request = store.put({ ...data, id });
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            completed++;
            if (completed === ops.length) resolve();
          };
        }
      });
    } else {
      return super.batchSet(ops);
    }
  }

  async clear(model?: string): Promise<void> {
    if (this.db) {
      if (model) {
        return new Promise((resolve, reject) => {
          const tx = this.db!.transaction([model], 'readwrite');
          const store = tx.objectStore(model);
          const request = store.clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      }
    } else {
      const prefix = this.config.persistence?.keyPrefix || 'ux3:';
      const modelPrefix = model ? `${prefix}${model}:` : prefix;
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(modelPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }

  async dump(model?: string): Promise<Record<string, any>> {
    if (model) {
      return {
        [model]: await this.list(model)
      };
    } else if (this.db) {
      const result: Record<string, any> = {};
      const stores = Array.from(this.db.objectStoreNames);
      
      for (const storeName of stores) {
        result[storeName] = await this.list(storeName);
      }
      
      return result;
    } else {
      // localStorage dump
      const result: Record<string, any> = {};
      const prefix = this.config.persistence?.keyPrefix || 'ux3:';
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const modelMatch = key.slice(prefix.length).split(':')[0];
          if (modelMatch && !modelMatch.startsWith('__')) {
            if (!result[modelMatch]) result[modelMatch] = [];
            const item = localStorage.getItem(key);
            if (item) result[modelMatch].push(JSON.parse(item));
          }
        }
      }
      
      return result;
    }
  }
}
