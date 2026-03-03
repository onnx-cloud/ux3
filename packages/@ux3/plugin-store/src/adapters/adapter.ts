import type { StorageAdapter, StoreConfig, Meta } from '../types';

/**
 * Base adapter class - provides defaults for adapter implementations
 */
export abstract class BaseAdapter implements StorageAdapter {
  name: string;
  config: StoreConfig;
  protected connected = false;

  constructor(name: string, config: StoreConfig) {
    this.name = name;
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract get(model: string, id: any): Promise<any>;
  abstract set(model: string, id: any, data: any): Promise<void>;
  abstract delete(model: string, id: any): Promise<void>;
  abstract list(model: string, filter?: any, sort?: any[]): Promise<any[]>;

  isConnected(): boolean {
    return this.connected;
  }

  async batchSet(ops: Array<[model: string, id: any, data: any]>): Promise<void> {
    for (const [model, id, data] of ops) {
      await this.set(model, id, data);
    }
  }

  async batchDelete(ops: Array<[model: string, id: any]>): Promise<void> {
    for (const [model, id] of ops) {
      await this.delete(model, id);
    }
  }

  async getMeta(model: string): Promise<Meta> {
    try {
      const data = await this.get(`__meta__:${model}`, 'meta');
      return data || { version: 1 };
    } catch {
      return { version: 1 };
    }
  }

  async setMeta(model: string, meta: Meta): Promise<void> {
    await this.set(`__meta__:${model}`, 'meta', meta);
  }

  async clear(model?: string): Promise<void> {
    // Default implementation - can be overridden
    if (model) {
      const items = await this.list(model);
      for (const item of items) {
        await this.delete(model, item.id);
      }
    }
  }

  async dump(model?: string): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    if (model) {
      result[model] = await this.list(model);
    } else {
      // Dump all models - subclasses should override with specific knowledge
      result['_error'] = 'Adapter.dump() requires model parameter';
    }
    
    return result;
  }
}
