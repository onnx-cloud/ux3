import { BaseServiceAdapter } from './base.js';
import type { RequestConfig, ServiceConfig } from './types.js';
import { HTTPService } from './http.js';
import { ServiceError, ServiceErrorCode } from './types.js';

export class S3Service extends BaseServiceAdapter<RequestConfig, unknown> {
  private http = new HTTPService(this.config as ServiceConfig);

  constructor(config: ServiceConfig = {}) {
    super('s3', config);
  }

  async transport(request: RequestConfig): Promise<unknown> {
    const baseUrl = request.baseUrl || this.config.baseUrl || '';
    if (!baseUrl) throw new ServiceError('S3Service requires a baseUrl', ServiceErrorCode.VALIDATION);

    if (/^https?:\/\//.test(baseUrl)) {
      return this.http.get(baseUrl, request);
    }

    if (baseUrl.startsWith('s3://')) {
      try {
        return await this.fetchWithAwsSdk(baseUrl);
      } catch (err) {
        throw new ServiceError(
          `S3Service failed to load object from ${baseUrl}`,
          ServiceErrorCode.UNKNOWN,
          { cause: err instanceof Error ? err : undefined }
        );
      }
    }

    throw new ServiceError('S3Service supports HTTPS S3 URLs or s3:// URLs', ServiceErrorCode.VALIDATION);
  }

  async execute(request: RequestConfig): Promise<unknown> { return this.transport(request); }
  async fetch(request: RequestConfig): Promise<unknown> { return this.execute(request); }

  private parseS3Url(s3Url: string): { bucket: string; key: string } {
    const url = new URL(s3Url);
    return { bucket: url.hostname, key: url.pathname.replace(/^\//, '') };
  }

  private async fetchWithAwsSdk(s3Url: string): Promise<unknown> {
    const { S3Client, GetObjectCommand } = await this.loadAwsSdk();
    const { bucket, key } = this.parseS3Url(s3Url);
    const client = new S3Client({ region: this.config.region || 'us-east-1' });

    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new ServiceError(`S3 object ${s3Url} returned empty body`, ServiceErrorCode.UNKNOWN);

    const chunks: Array<Uint8Array> = [];
    for await (const chunk of response.Body as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const body = Buffer.concat(chunks).toString('utf-8');
    try { return JSON.parse(body); } catch { return body; }
  }

  private async loadAwsSdk(): Promise<{ S3Client: new (...args: unknown[]) => { send: (cmd: unknown) => Promise<{ Body?: AsyncIterable<Uint8Array> }> }; GetObjectCommand: new (input: unknown) => unknown }> {
    const importModule = new Function('moduleName', 'return import(moduleName)');
    return await importModule(['@aws-sdk', 'client-s3'].join('/'));
  }
}
