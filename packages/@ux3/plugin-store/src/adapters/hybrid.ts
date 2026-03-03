import { BaseAdapter } from './adapter';
import { LocalAdapter } from './local';
import { RemoteAdapter } from './remote';
import type { StoreConfig } from '../types';

/**
 * Hybrid adapter - Combines local cache with remote sync and conflict resolution
 */
export class HybridAdapter extends BaseAdapter {
  private localAdapter: LocalAdapter;
  private remoteAdapter: RemoteAdapter;
  private syncQueue: Array<{
    op: 'create' | 'update' | 'delete';
    model: string;
    id: any;
    data?: any;
  }> = [];
  private syncInProgress = false;
  private syncInterval?: NodeJS.Timeout;

  constructor(config: StoreConfig) {
    super('hybrid', config);
    
    // Create local adapter with local config
    const localConfig: StoreConfig = {
      ...config,
      backend: 'local',
      persistence: (config as any).local?.persistence || config.persistence
    };
    this.localAdapter = new LocalAdapter(localConfig);

    // Create remote adapter with remote config
    const remoteConfig: StoreConfig = {
      ...config,
      backend: 'remote',
      baseUrl: (config as any).remote?.baseUrl || config.baseUrl,
      auth: (config as any).remote?.auth || config.auth
    };
    this.remoteAdapter = new RemoteAdapter(remoteConfig);
  }

  async connect(): Promise<void> {
    await this.localAdapter.connect();
    await this.remoteAdapter.connect();

    // Start sync interval if configured
    const batchInterval = this.config.sync?.batchInterval || 5000;
    this.syncInterval = setInterval(() => {
      this.sync().catch(e => console.error('[HybridAdapter] Sync error:', e));
    }, batchInterval);

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    await this.localAdapter.disconnect();
    await this.remoteAdapter.disconnect();
    this.connected = false;
  }

  async get(model: string, id: any): Promise<any> {
    // Prioritize local (for optimistic writes), fall back to remote
    let item = await this.localAdapter.get(model, id);
    
    if (!item && this.remoteAdapter.isConnected()) {
      item = await this.remoteAdapter.get(model, id);
      if (item) {
        // Cache locally
        await this.localAdapter.set(model, id, item);
      }
    }
    
    return item;
  }

  async set(model: string, id: any, data: any): Promise<void> {
    // Write locally first (optimistic)
    await this.localAdapter.set(model, id, data);

    // Queue for remote sync if optimistic writes enabled
    if (this.config.sync?.optimisticWrites) {
      this.syncQueue.push({
        op: 'update',
        model,
        id,
        data
      });
    } else {
      // Try immediate remote sync
      try {
        if (this.remoteAdapter.isConnected()) {
          await this.remoteAdapter.set(model, id, data);
        } else {
          this.syncQueue.push({ op: 'update', model, id, data });
        }
      } catch (e) {
        // Queue for retry
        this.syncQueue.push({ op: 'update', model, id, data });
      }
    }
  }

  async delete(model: string, id: any): Promise<void> {
    await this.localAdapter.delete(model, id);

    if (this.config.sync?.optimisticWrites) {
      this.syncQueue.push({ op: 'delete', model, id });
    } else {
      try {
        if (this.remoteAdapter.isConnected()) {
          await this.remoteAdapter.delete(model, id);
        } else {
          this.syncQueue.push({ op: 'delete', model, id });
        }
      } catch (e) {
        this.syncQueue.push({ op: 'delete', model, id });
      }
    }
  }

  async list(model: string, filter?: any, sort?: any[]): Promise<any[]> {
    // For offline-first, prefer local cache
    return this.localAdapter.list(model, filter, sort);
  }

  async sync(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const queueCopy = [...this.syncQueue];
    this.syncQueue = [];

    try {
      if (!this.remoteAdapter.isConnected()) {
        // Put items back in queue
        this.syncQueue = queueCopy;
        this.syncInProgress = false;
        return;
      }

      // Batch operations
      const creates = queueCopy.filter(q => q.op === 'create');
      const updates = queueCopy.filter(q => q.op === 'update');
      const deletes = queueCopy.filter(q => q.op === 'delete');

      // Send updates and creates
      if (updates.length > 0 || creates.length > 0) {
        const ops = [...creates, ...updates].map(q => [
          q.model,
          q.id,
          q.data
        ] as [string, any, any]);
        
        if (ops.length > 0) {
          await this.remoteAdapter.batchSet(ops);
        }
      }

      // Send deletes
      if (deletes.length > 0) {
        const ops = deletes.map(q => [
          q.model,
          q.id
        ] as [string, any]);
        
        if (ops.length > 0) {
          await this.remoteAdapter.batchDelete(ops);
        }
      }

      // Fetch remote updates for conflict resolution
      if (this.config.sync?.strategy === 'crdt' && (creates.length > 0 || updates.length > 0)) {
        for (const op of [...creates, ...updates]) {
          const remoteData = await this.remoteAdapter.get(op.model, op.id);
          if (remoteData) {
            const localData = await this.localAdapter.get(op.model, op.id);
            const resolved = this.resolveConflict(localData, remoteData, op.model);
            await this.localAdapter.set(op.model, op.id, resolved);
          }
        }
      }
    } catch (e) {
      console.error('[HybridAdapter] Sync failed:', e);
      // Put items back in queue for retry
      this.syncQueue = [...queueCopy, ...this.syncQueue];
    } finally {
      this.syncInProgress = false;
    }
  }

  private resolveConflict(local: any, remote: any, model: string): any {
    const strategy = this.config.sync?.strategy || 'last-write-wins';

    if (strategy === 'local-preferred') {
      return local;
    } else if (strategy === 'crdt') {
      // Last-write-wins based on timestamp
      const localTime = local?.updated || local?.created || 0;
      const remoteTime = remote?.updated || remote?.created || 0;
      return localTime >= remoteTime ? local : remote;
    } else {
      // last-write-wins (default): remote wins
      return remote;
    }
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

  async clear(model?: string): Promise<void> {
    await this.localAdapter.clear(model);
    if (this.remoteAdapter.isConnected()) {
      // Don't clear remote for safety
    }
  }

  async dump(model?: string): Promise<Record<string, any>> {
    return this.localAdapter.dump(model);
  }
}
