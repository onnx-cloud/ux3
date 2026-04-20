import { Service } from './base.js';
import { HTTPService } from './http.js';
import type { RequestConfig, ServiceConfig } from './types.js';

export class S3Service extends Service<RequestConfig, any> {
  private http = new HTTPService(this.config);

  constructor(config: ServiceConfig = {}) {
    super(config);
  }

  async fetch(request: RequestConfig): Promise<any> {
    const baseUrl = request.baseUrl || this.config.baseUrl || '';

    if (!baseUrl) {
      throw new Error('S3Service requires a baseUrl or request.baseUrl');
    }

    if (/^https?:\/\//.test(baseUrl)) {
      return this.http.get(baseUrl, request);
    }

    if (baseUrl.startsWith('s3://')) {
      try {
        return await this.fetchWithAwsSdk(baseUrl);
      } catch (err) {
        throw new Error(
          `S3Service failed to load object from ${baseUrl}. Install @aws-sdk/client-s3 or provide an HTTPS presigned URL. ${err}`
        );
      }
    }

    throw new Error('S3Service supports HTTPS S3 URLs or s3:// URLs when AWS SDK is available');
  }

  private parseS3Url(s3Url: string): { bucket: string; key: string } {
    const url = new URL(s3Url);
    const bucket = url.hostname;
    const key = url.pathname.replace(/^\//, '');
    return { bucket, key };
  }

  private async fetchWithAwsSdk(s3Url: string): Promise<any> {
    const { S3Client, GetObjectCommand } = await this.loadAwsSdk();
    const { bucket, key } = this.parseS3Url(s3Url);
    const client = new S3Client({ region: this.config.region || 'us-east-1' });

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`S3 object ${s3Url} returned empty body`);
    }

    const chunks: Array<Uint8Array> = [];
    for await (const chunk of response.Body as any) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const body = Buffer.concat(chunks).toString('utf-8');
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  private async loadAwsSdk(): Promise<any> {
    try {
      const moduleName = ['@aws-sdk', 'client-s3'].join('/');
      const importModule = new Function(
        'moduleName',
        'return import(moduleName);'
      );
      return await importModule(moduleName);
    } catch (err) {
      throw new Error('Optional dependency @aws-sdk/client-s3 is not installed');
    }
  }
}
