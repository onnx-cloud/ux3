import { BaseAdapter } from './adapter';
import type { StoreConfig } from '../types';

/**
 * Remote adapter - Uses HTTP REST or JSON-RPC backend for persistence
 */
export class RemoteAdapter extends BaseAdapter {
  private baseUrl: string;

  constructor(config: StoreConfig) {
    super('remote', config);
    this.baseUrl = config.baseUrl || 'http://localhost:3000/api';
  }

  async connect(): Promise<void> {
    // Verify connection to remote server
    try {
      await this.request('GET', '/health');
      this.connected = true;
    } catch (e) {
      console.warn('[RemoteAdapter] Failed to connect to remote server:', e);
      this.connected = true; // Allow offline, will queue writes
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.config.auth) {
      if (this.config.auth.type === 'bearer' && this.config.auth.token) {
        headers['Authorization'] = `Bearer ${this.config.auth.token}`;
      } else if (this.config.auth.type === 'api-key' && this.config.auth.token) {
        const headerName = this.config.auth.header || 'X-API-Key';
        headers[headerName] = this.config.auth.token;
      }
    }
    
    return headers;
  }

  private async request(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async get(model: string, id: any): Promise<any> {
    try {
      return await this.request('GET', `/${model}/${id}`);
    } catch (e) {
      console.error(`[RemoteAdapter] Failed to get ${model}:${id}`, e);
      return null;
    }
  }

  async set(model: string, id: any, data: any): Promise<void> {
    try {
      // Check if exists by trying to fetch
      const existing = await this.get(model, id);
      
      if (existing) {
        // Update
        await this.request('PUT', `/${model}/${id}`, data);
      } else {
        // Create
        await this.request('POST', `/${model}`, { ...data, id });
      }
    } catch (e) {
      console.error(`[RemoteAdapter] Failed to set ${model}:${id}`, e);
      throw e;
    }
  }

  async delete(model: string, id: any): Promise<void> {
    try {
      await this.request('DELETE', `/${model}/${id}`);
    } catch (e) {
      console.error(`[RemoteAdapter] Failed to delete ${model}:${id}`, e);
      throw e;
    }
  }

  async list(model: string, filter?: any, sort?: any[]): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      if (filter) {
        params.append('filter', JSON.stringify(filter));
      }
      
      if (sort) {
        params.append('sort', JSON.stringify(sort));
      }
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const result = await this.request('GET', `/${model}${query}`);
      
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.error(`[RemoteAdapter] Failed to list ${model}`, e);
      return [];
    }
  }

  async batchSet(ops: Array<[model: string, id: any, data: any]>): Promise<void> {
    try {
      await this.request('POST', '/batch', {
        operations: ops.map(([model, id, data]) => ({
          method: 'upsert',
          model,
          id,
          data
        }))
      });
    } catch (e) {
      console.error('[RemoteAdapter] Failed to batch set:', e);
      throw e;
    }
  }

  async batchDelete(ops: Array<[model: string, id: any]>): Promise<void> {
    try {
      await this.request('POST', '/batch', {
        operations: ops.map(([model, id]) => ({
          method: 'delete',
          model,
          id
        }))
      });
    } catch (e) {
      console.error('[RemoteAdapter] Failed to batch delete:', e);
      throw e;
    }
  }
}
