import { BaseServiceAdapter } from './base.js';
import type { RequestConfig, ServiceConfig } from './types.js';
import * as path from 'path';

const isNode = typeof process !== 'undefined' && process.release?.name === 'node';

export class FileService extends BaseServiceAdapter<RequestConfig, unknown> {
  constructor(config: ServiceConfig = {}) {
    super('file', config);
  }

  async transport(request: RequestConfig): Promise<unknown> {
    const baseUrl = request.baseUrl || this.config.baseUrl || '';
    if (!baseUrl) throw new Error('FileService requires a baseUrl or request.baseUrl');
    if (!baseUrl.startsWith('file://')) throw new Error('FileService requires a file:// URL');
    if (!isNode) throw new Error('Local file access is only supported in Node environments');
    return this.readLocalFile(this.toLocalPath(baseUrl));
  }

  async execute(request: RequestConfig): Promise<unknown> { return this.transport(request); }

  async fetch(request: RequestConfig): Promise<unknown> { return this.execute(request); }

  private toLocalPath(location: string): string {
    if (location.startsWith('file://')) {
      try {
        return new URL(location).pathname;
      } catch {
        return location.replace(/^file:\/\//, '');
      }
    }
    if (path.isAbsolute(location)) return location;
    return path.resolve(process.cwd(), location);
  }

  private async readLocalFile(filePath: string): Promise<unknown> {
    const fs = new Function('id', 'return require(id)')('fs');
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(raw);
    }
    return raw;
  }
}
