import { BaseAdapter } from './adapter';
import type { StoreConfig } from '../types';

/**
 * Memory adapter - In-memory storage for testing
 */
export class MemoryAdapter extends BaseAdapter {
  private data: Record<string, Map<any, any>> = {};

  constructor(config: StoreConfig) {
    super('memory', config);
  }

  async connect(): Promise<void> {
    // Seed data if provided
    if (this.config.seedData) {
      for (const [model, items] of Object.entries(this.config.seedData)) {
        if (!this.data[model]) {
          this.data[model] = new Map();
        }
        for (const item of items) {
          this.data[model].set(item.id, item);
        }
      }
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.data = {};
    this.connected = false;
  }

  private ensureModel(model: string): void {
    if (!this.data[model]) {
      this.data[model] = new Map();
    }
  }

  async get(model: string, id: any): Promise<any> {
    this.ensureModel(model);
    return this.data[model].get(id);
  }

  async set(model: string, id: any, data: any): Promise<void> {
    this.ensureModel(model);
    this.data[model].set(id, { ...data, id });
  }

  async delete(model: string, id: any): Promise<void> {
    this.ensureModel(model);
    this.data[model].delete(id);
  }

  async list(model: string, filter?: any, sort?: any[]): Promise<any[]> {
    this.ensureModel(model);
    let results = Array.from(this.data[model].values());

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

    return results;
  }

  async dump(model?: string): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    if (model) {
      this.ensureModel(model);
      result[model] = Array.from(this.data[model].values());
    } else {
      for (const [modelName, modelData] of Object.entries(this.data)) {
        if (!modelName.startsWith('__')) {
          result[modelName] = Array.from(modelData.values());
        }
      }
    }
    
    return result;
  }

  async clear(model?: string): Promise<void> {
    if (model) {
      this.data[model] = new Map();
    } else {
      this.data = {};
    }
  }
}
