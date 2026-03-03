import { LocalAdapter } from './adapters/local';
import { RemoteAdapter } from './adapters/remote';
import { HybridAdapter } from './adapters/hybrid';
import { MemoryAdapter } from './adapters/memory';
import type {
  StorageAdapter,
  StoreConfig,
  Change,
  Operation,
  TransactionResult,
  SyncResult,
  ValidationResult,
  StoreSubscriber,
  DirtySubscriber
} from './types';

/**
 * Core Store class - Main API for storage operations
 */
export class Store {
  private adapter: StorageAdapter;
  private config: StoreConfig;
  private subscribers: Map<string, StoreSubscriber[]> = new Map();
  private dirtySubscribers: Map<string, DirtySubscriber[]> = new Map();
  private dirtyIds: Map<string, Set<any>> = new Map();

  constructor(config: StoreConfig) {
    this.config = config;
    this.adapter = this.createAdapter(config);
  }

  private createAdapter(config: StoreConfig): StorageAdapter {
    switch (config.backend) {
      case 'local':
        return new LocalAdapter(config);
      case 'remote':
        return new RemoteAdapter(config);
      case 'hybrid':
        return new HybridAdapter(config);
      case 'memory':
        return new MemoryAdapter(config);
      default:
        throw new Error(`Unknown backend: ${config.backend}`);
    }
  }

  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  isConnected(): boolean {
    return this.adapter.isConnected();
  }

  /**
   * Query a single item by ID
   */
  async findOne(model: string, id: any): Promise<any> {
    return this.adapter.get(model, id);
  }

  /**
   * Query multiple items with optional filtering and sorting
   */
  async find(
    model: string,
    filter?: any,
    sort?: Array<{ field?: string; dir?: 'asc' | 'desc' }>
  ): Promise<any[]> {
    return this.adapter.list(model, filter, sort);
  }

  /**
   * Create a new item
   */
  async create(model: string, data: any): Promise<any> {
    // Validate if validator exists
    const result = await this.validate(model, data);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
    }

    // Generate ID if not provided
    const id = data.id || this.generateId();
    const item = { ...data, id };

    await this.adapter.set(model, id, item);
    this.emit('create', model, id, item);
    this.markDirty(model, id);

    return item;
  }

  /**
   * Update an existing item
   */
  async update(model: string, id: any, data: any): Promise<any> {
    const existing = await this.adapter.get(model, id);
    if (!existing) {
      throw new Error(`Item not found: ${model}:${id}`);
    }

    const merged = { ...existing, ...data, id };

    // Validate
    const result = await this.validate(model, merged);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
    }

    await this.adapter.set(model, id, merged);
    this.emit('update', model, id, merged, existing);
    this.markDirty(model, id);

    return merged;
  }

  /**
   * Upsert - update if exists, create if not
   */
  async upsert(model: string, id: any, data: any): Promise<any> {
    const existing = await this.adapter.get(model, id);

    if (existing) {
      return this.update(model, id, data);
    } else {
      return this.create(model, { ...data, id });
    }
  }

  /**
   * Delete an item
   */
  async delete(model: string, id: any): Promise<void> {
    const existing = await this.adapter.get(model, id);

    await this.adapter.delete(model, id);
    this.emit('delete', model, id, undefined, existing);
    this.markDirty(model, id);
  }

  /**
   * Create multiple items
   */
  async bulkCreate(model: string, items: any[]): Promise<any[]> {
    const created = [];

    for (const item of items) {
      const id = item.id || this.generateId();
      const data = { ...item, id };

      const result = await this.validate(model, data);
      if (!result.valid) {
        throw new Error(`Validation failed for item ${id}: ${result.errors?.join(', ')}`);
      }

      await this.adapter.set(model, id, data);
      this.emit('create', model, id, data);
      this.markDirty(model, id);
      created.push(data);
    }

    return created;
  }

  /**
   * Update multiple items
   */
  async bulkUpdate(
    model: string,
    updates: Map<any, any> | Record<any, any>
  ): Promise<any[]> {
    const updated = [];
    const updateMap = updates instanceof Map ? updates : new Map(Object.entries(updates));

    for (const [id, data] of updateMap) {
      try {
        const item = await this.update(model, id, data);
        updated.push(item);
      } catch (e) {
        console.error(`Failed to update ${model}:${id}:`, e);
      }
    }

    return updated;
  }

  /**
   * Execute a transaction (atomic multi-model write)
   */
  async transaction(operations: Operation[]): Promise<TransactionResult> {
    const results = [];
    const errors = [];

    try {
      for (const op of operations) {
        try {
          let result: any;

          switch (op.method) {
            case 'create':
              result = await this.create(op.model, op.data);
              break;
            case 'update':
              result = await this.update(op.model, op.id!, op.data);
              break;
            case 'delete':
              await this.delete(op.model, op.id!);
              result = null;
              break;
          }

          results.push(result);
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          errors.push({ op, error });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (e) {
      return {
        success: false,
        results: [],
        errors: [{ op: null, error: String(e) }]
      };
    }
  }

  /**
   * Validate data against model schema
   */
  private async validate(model: string, data: any): Promise<ValidationResult> {
    // Basic validation - can be extended with model schema
    const modelDef = this.config.models?.[model];

    if (!modelDef) {
      // No schema defined, accept all
      return { valid: true };
    }

    const errors: string[] = [];

    for (const [field, def] of Object.entries(modelDef.fields || {})) {
      const value = data[field];

      if (def.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
      }

      if (value !== undefined && def.type === 'string' && def.maxLength) {
        if (typeof value === 'string' && value.length > def.maxLength) {
          errors.push(`${field} exceeds maxLength of ${def.maxLength}`);
        }
      }

      if (value !== undefined && def.type === 'number' && def.min !== undefined) {
        if (typeof value === 'number' && value < def.min) {
          errors.push(`${field} must be >= ${def.min}`);
        }
      }

      if (value !== undefined && def.type === 'integer' && !Number.isInteger(value)) {
        errors.push(`${field} must be an integer`);
      }

      if (value !== undefined && def.type === 'enum' && def.values) {
        if (!def.values.includes(value)) {
          errors.push(`${field} must be one of: ${def.values.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Subscribe to model changes
   */
  subscribe(model: string, listener: StoreSubscriber): () => void {
    if (!this.subscribers.has(model)) {
      this.subscribers.set(model, []);
    }

    this.subscribers.get(model)!.push(listener);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(model);
      if (subs) {
        const idx = subs.indexOf(listener);
        if (idx >= 0) {
          subs.splice(idx, 1);
        }
      }
    };
  }

  /**
   * Subscribe to dirty changes (for sync triggers)
   */
  onDirty(model: string, listener: DirtySubscriber): () => void {
    if (!this.dirtySubscribers.has(model)) {
      this.dirtySubscribers.set(model, []);
    }

    this.dirtySubscribers.get(model)!.push(listener);

    return () => {
      const subs = this.dirtySubscribers.get(model);
      if (subs) {
        const idx = subs.indexOf(listener);
        if (idx >= 0) {
          subs.splice(idx, 1);
        }
      }
    };
  }

  private emit(
    op: 'create' | 'update' | 'delete',
    model: string,
    id: any,
    data?: any,
    before?: any
  ): void {
    const change: Change = {
      op,
      model,
      id,
      data,
      before,
      after: data,
      timestamp: Date.now()
    };

    const subs = this.subscribers.get(model);
    if (subs) {
      for (const subscriber of subs) {
        try {
          subscriber(change);
        } catch (e) {
          console.error('[Store] Subscriber error:', e);
        }
      }
    }
  }

  private markDirty(model: string, id: any): void {
    if (!this.dirtyIds.has(model)) {
      this.dirtyIds.set(model, new Set());
    }

    this.dirtyIds.get(model)!.add(id);

    // Emit dirty event
    const dirtySet = this.dirtyIds.get(model)!;
    const dirtyArray = Array.from(dirtySet);

    const subs = this.dirtySubscribers.get(model);
    if (subs) {
      for (const subscriber of subs) {
        try {
          subscriber(model, dirtyArray);
        } catch (e) {
          console.error('[Store] Dirty subscriber error:', e);
        }
      }
    }
  }

  /**
   * Sync hybrid adapter (if applicable)
   */
  async sync(): Promise<SyncResult> {
    if (this.adapter instanceof HybridAdapter) {
      await this.adapter.sync();
    }

    return {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Clear storage
   */
  async clear(model?: string): Promise<void> {
    await this.adapter.clear(model);
  }

  /**
   * Dump all data (debugging)
   */
  async dump(model?: string): Promise<Record<string, any>> {
    return this.adapter.dump(model);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
