import { BaseAdapter } from './adapter';
import type { StoreConfig, Meta } from '../types';

let fs: typeof import('fs/promises') | null = null;
let pathModule: typeof import('path') | null = null;

function ensureNodes(): void {
  if (fs && pathModule) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fs = require('fs/promises');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pathModule = require('path');
  } catch {
    fs = null;
    pathModule = null;
  }
}

function safeId(id: any): string {
  if (id === undefined || id === null) return 'null';
  if (typeof id === 'string' || typeof id === 'number' || typeof id === 'boolean') {
    return encodeURIComponent(String(id));
  }
  return encodeURIComponent(JSON.stringify(id));
}

export class FileAdapter extends BaseAdapter {
  private rootDir: string;
  private backups: Record<string, Map<any, any>> = {};

  constructor(config: StoreConfig) {
    super('file', config);
    ensureNodes();
    this.rootDir = this.resolveRootDir();
  }

  private resolveRootDir(): string {
    const dir = this.config.persistence?.dir || './ux3-store';
    if (typeof dir !== 'string') return './ux3-store';
    return pathModule ? pathModule.resolve(dir) : dir;
  }

  private async ensureDir(model: string): Promise<void> {
    if (!fs || !pathModule) return;
    const dir = pathModule.join(this.rootDir, model);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private async getPath(model: string, id: any): Promise<string> {
    if (!pathModule) throw new Error('[FileAdapter] fs not available');
    const prefix = this.config.persistence?.keyPrefix ? `${safeId(this.config.persistence.keyPrefix)}-` : '';
    const fileName = `${prefix}${safeId(id)}.json`;
    return pathModule.join(this.rootDir, model, fileName);
  }

  async connect(): Promise<void> {
    if (!fs || !pathModule) {
      this.connected = true;
      return;
    }
    try {
      await fs.mkdir(this.rootDir, { recursive: true });
      if (this.config.seedData) {
        for (const [model, items] of Object.entries(this.config.seedData || {})) {
          const modelDir = pathModule.join(this.rootDir, model);
          await fs.mkdir(modelDir, { recursive: true });
          for (const item of items) {
            const id = item.id ?? String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
            const filePath = pathModule.join(modelDir, `${safeId(id)}.json`);
            await fs.writeFile(filePath, JSON.stringify({ ...item, id }, null, 2), 'utf-8');
          }
        }
      }
    } catch {
      // ignore permissions issues
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async get(model: string, id: any): Promise<any> {
    if (!fs || !pathModule) {
      return this.loadFallback(model, id);
    }
    const filePath = await this.getPath(model, id);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  async set(model: string, id: any, data: any): Promise<void> {
    if (!fs || !pathModule) {
      this.saveFallback(model, id, data);
      return;
    }
    await this.ensureDir(model);
    const filePath = await this.getPath(model, id);
    await fs.writeFile(filePath, JSON.stringify({ ...data, id }, null, 2), 'utf-8');
  }

  async delete(model: string, id: any): Promise<void> {
    if (!fs || !pathModule) {
      this.deleteFallback(model, id);
      return;
    }
    const filePath = await this.getPath(model, id);
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore missing file
    }
  }

  async list(model: string, filter?: any, sort?: any[]): Promise<any[]> {
    if (!fs || !pathModule) {
      return this.listFallback(model, filter, sort);
    }
    const dir = pathModule.join(this.rootDir, model);
    try {
      const entries = await fs.readdir(dir);
      const items = [];
      for (const name of entries) {
        if (!name.endsWith('.json')) continue;
        try {
          const body = await fs.readFile(pathModule.join(dir, name), 'utf-8');
          items.push(JSON.parse(body));
        } catch {
          continue;
        }
      }
      return this.applyFilterSort(items, filter, sort);
    } catch {
      return [];
    }
  }

  async batchSet(ops: Array<[model: string, id: any, data: any]>): Promise<void> {
    if (!fs || !pathModule) {
      return super.batchSet(ops);
    }
    const grouped = new Map<string, Array<[any, any]>>();
    for (const [model, id, data] of ops) {
      if (!grouped.has(model)) grouped.set(model, []);
      grouped.get(model)!.push([id, data]);
    }
    for (const [model, items] of grouped) {
      await this.ensureDir(model);
      for (const [id, data] of items) {
        const filePath = await this.getPath(model, id);
        await fs.writeFile(filePath, JSON.stringify({ ...data, id }, null, 2), 'utf-8');
      }
    }
  }

  async batchDelete(ops: Array<[model: string, id: any]>): Promise<void> {
    if (!fs || !pathModule) {
      return super.batchDelete(ops);
    }
    for (const [model, id] of ops) {
      const filePath = await this.getPath(model, id);
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore
      }
    }
  }

  async clear(model?: string): Promise<void> {
    if (!fs || !pathModule) {
      return super.clear(model);
    }
    if (model) {
      const dir = pathModule.join(this.rootDir, model);
      try {
        const entries = await fs.readdir(dir);
        await Promise.all(entries.map((file) => fs.unlink(pathModule.join(dir, file))));
      } catch {
        // ignore
      }
    } else {
      try {
        const entries = await fs.readdir(this.rootDir);
        await Promise.all(entries.map(async (name) => {
          const child = pathModule!.join(this.rootDir, name);
          const stat = await fs!.stat(child);
          if (stat.isDirectory()) {
            const files = await fs!.readdir(child);
            await Promise.all(files.map((file) => fs!.unlink(pathModule!.join(child, file))));
          }
        }));
      } catch {
        // ignore
      }
    }
  }

  async dump(model?: string): Promise<Record<string, any>> {
    if (!fs || !pathModule) {
      return super.dump(model);
    }
    const result: Record<string, any> = {};
    if (model) {
      result[model] = await this.list(model);
      return result;
    }
    try {
      const models = await fs.readdir(this.rootDir);
      for (const modelName of models) {
        const modelPath = pathModule.join(this.rootDir, modelName);
        const stat = await fs.stat(modelPath);
        if (stat.isDirectory()) {
          result[modelName] = await this.list(modelName);
        }
      }
    } catch {
      // ignore
    }
    return result;
  }

  private ensureFallback(model: string): void {
    if (!this.backups[model]) this.backups[model] = new Map();
  }

  private loadFallback(model: string, id: any): any {
    this.ensureFallback(model);
    return this.backups[model].get(id);
  }

  private saveFallback(model: string, id: any, data: any): void {
    this.ensureFallback(model);
    this.backups[model].set(id, { ...data, id });
  }

  private deleteFallback(model: string, id: any): void {
    this.ensureFallback(model);
    this.backups[model].delete(id);
  }

  private listFallback(model: string, filter?: any, sort?: any[]): any[] {
    this.ensureFallback(model);
    return this.applyFilterSort(Array.from(this.backups[model].values()), filter, sort);
  }

  private applyFilterSort(items: any[], filter?: any, sort?: any[]): any[] {
    let results = items;
    if (filter) {
      results = results.filter(item => {
        for (const [key, value] of Object.entries(filter)) {
          if (item[key] !== value) return false;
        }
        return true;
      });
    }
    if (sort && sort.length > 0) {
      results = results.slice();
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
