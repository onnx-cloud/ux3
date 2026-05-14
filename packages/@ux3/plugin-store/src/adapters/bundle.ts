import { BaseAdapter } from './adapter';
import type { StoreConfig } from '../types';

interface BundleData {
  [model: string]: Map<any, any>;
}

/**
 * Bundle adapter - stores data in-memory and exposes a serializable bundle payload.
 */
export class BundleAdapter extends BaseAdapter {
  private data: BundleData = {};

  constructor(config: StoreConfig) {
    super('bundle', config);
  }

  async connect(): Promise<void> {
    if (this.config.seedData) {
      for (const [model, items] of Object.entries(this.config.seedData)) {
        this.ensureModel(model);
        for (const item of items) {
          this.data[model].set(item.id, { ...item, id: item.id });
        }
      }
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
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

    if (filter) {
      results = results.filter((item) => {
        for (const [key, value] of Object.entries(filter)) {
          if (item[key] !== value) return false;
        }
        return true;
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

  async batchSet(ops: Array<[string, any, any]>): Promise<void> {
    for (const [model, id, data] of ops) {
      await this.set(model, id, data);
    }
  }

  async batchDelete(ops: Array<[string, any]>): Promise<void> {
    for (const [model, id] of ops) {
      await this.delete(model, id);
    }
  }

  async clear(model?: string): Promise<void> {
    if (model) {
      this.data[model] = new Map();
    } else {
      this.data = {};
    }
  }

  async dump(model?: string): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    if (model) {
      this.ensureModel(model);
      result[model] = Array.from(this.data[model].values());
    } else {
      for (const [modelName, modelData] of Object.entries(this.data)) {
        result[modelName] = Array.from(modelData.values());
      }
    }
    return result;
  }

  bundle(): Record<string, any> {
    const output: Record<string, any> = {
      bundleKey: this.config.bundle?.key || 'bundle',
      version: this.config.bundle?.version || '1.0.0',
      metadata: this.config.bundle?.metadata || {},
      models: {},
    };

    for (const [model, items] of Object.entries(this.data)) {
      output.models[model] = Array.from(items.values());
    }

    return output;
  }
}
