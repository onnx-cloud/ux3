import { HttpService } from './http.js';
import { FileService } from './file.js';
import { S3Service } from './s3.js';
import { WebSocketService } from './websocket.js';
import { JSONRPCService } from './jsonrpc.js';
import type { Service, ServiceConfig } from './types.js';

export interface ServiceSpec {
  type?: string;
  adapter?: string;
  config?: ServiceConfig;
  [key: string]: any;
}

export class ServiceFactory {
  static create(name: string, spec: ServiceSpec): Service {
    const svcType = spec.type || spec.adapter;
    const { type: _t, adapter: _a, config: nestedCfg, ...flatCfg } = spec;
    const svcConfig: ServiceConfig = nestedCfg ?? (flatCfg as unknown as ServiceConfig);

    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[ServiceFactory] create', name, { svcType, svcConfig });
    }

    switch (svcType) {
      case 'http':
        return new HttpService(svcConfig);
      case 'websocket':
        return new WebSocketService(svcConfig as any);
      case 'jsonrpc':
        return new JSONRPCService(svcConfig);
      case 'file':
        return new FileService(svcConfig);
      case 's3':
        return new S3Service(svcConfig as any);
      case 'mock':
        return this.buildMockService(svcConfig);
      case 'plugin':
        return this.buildPluginStub(name);
      default:
        throw new Error(`Unknown service type: ${svcType} for service ${name}`);
    }
  }

  private static buildMockService(svcConfig: ServiceConfig): Service {
    const mockResponses = (svcConfig as any).responses || {};

    const resolvePath = (obj: any, path: string): any => {
      if (obj == null) return undefined;
      return path.split('.').reduce((current, segment) => {
        if (current === undefined || current === null) return undefined;
        return current[segment];
      }, obj);
    };

    const resolveTemplate = (value: any, request: any): any => {
      if (typeof value === 'string') {
        return value.replace(/\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s*\}\}/g, (_match, key) => {
          const [root, ...pathParts] = key.split('.');
          const source = root === 'request' ? request : request?.[root];
          const resolved = resolvePath(source, pathParts.join('.'));
          return resolved !== undefined && resolved !== null ? String(resolved) : '';
        });
      }
      if (Array.isArray(value)) {
        return value.map((item) => resolveTemplate(item, request));
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, resolveTemplate(item, request)])
        );
      }
      return value;
    };

    const resolveResponse = async (handler: any, request: any): Promise<any> => {
      const response = typeof handler === 'function' ? await handler(request, svcConfig) : handler;
      return resolveTemplate(response, request);
    };

    return {
      async fetch(request: any) {
        const response = mockResponses.fetch ?? mockResponses.default;
        return response !== undefined ? resolveResponse(response, request) : { success: true, request };
      },
      async call(method: string, params?: any) {
        const response = mockResponses[method] ?? mockResponses.call ?? mockResponses.default;
        const request = { method, params };
        return response !== undefined ? resolveResponse(response, request) : { success: true, method, params };
      },
    } as Service;
  }

  private static buildPluginStub(name: string): Service {
    const pluginError = new Error(
      `Plugin service '${name}' is not installed yet; install the plugin that provides it before invoking.`
    );
    return Object.assign(
      (async () => {
        throw pluginError;
      }) as any,
      {
        async fetch() {
          throw pluginError;
        },
        async call() {
          throw pluginError;
        },
        async update() {
          throw pluginError;
        },
        async find() {
          throw pluginError;
        },
        subscribe() {
          return { unsubscribe: () => {} };
        },
      }
    ) as any;
  }
}
