import { Service } from './base.js';
import { HTTPService } from './http.js';
import type { RequestConfig, ServiceConfig } from './types.js';
import * as path from 'path';

const isNode = typeof process !== 'undefined' && process.release?.name === 'node';

export class FileService extends Service<RequestConfig, any> {
  private http = new HTTPService(this.config);

  constructor(config: ServiceConfig = {}) {
    super(config);
  }

  async fetch(request: RequestConfig): Promise<any> {
    const baseUrl = request.baseUrl || this.config.baseUrl || '';

    if (!baseUrl) {
      throw new Error('FileService requires a baseUrl or request.baseUrl');
    }

    if (/^https?:\/\//.test(baseUrl)) {
      return this.http.get(baseUrl, request);
    }

    if (baseUrl.startsWith('file://')) {
      return this.readLocalFile(this.toLocalPath(baseUrl));
    }

    if (isNode) {
      return this.readLocalFile(this.toLocalPath(baseUrl));
    }

    throw new Error(
      `FileService cannot resolve local file path in this environment: ${baseUrl}`
    );
  }

  private toLocalPath(location: string): string {
    if (location.startsWith('file://')) {
      try {
        return new URL(location).pathname;
      } catch {
        return location.replace(/^file:\/\//, '');
      }
    }

    if (path.isAbsolute(location)) {
      return location;
    }

    return path.resolve(process.cwd(), location);
  }

  private async readLocalFile(filePath: string): Promise<any> {
    if (!isNode) {
      throw new Error('Local file access is only supported in Node environments.');
    }

    const fs = new Function('id', 'return require(id)')('fs');
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      try {
        return JSON.parse(raw);
      } catch (err) {
        throw new Error(`Failed to parse JSON file ${filePath}: ${err}`);
      }
    }

    return raw;
  }
}
