import { HttpService } from './http.js';
import { FileService } from './file.js';
import { S3Service } from './s3.js';
import { WebSocketService } from './websocket.js';
import { JSONRPCService } from './jsonrpc.js';
import type { Service, ServiceConfig, ServiceAdapter } from './types.js';

export interface ServiceSpec {
  type?: string;
  adapter?: string;
  config?: ServiceConfig;
  [key: string]: unknown;
}

export class ServiceFactory {
  private static customAdapters = new Map<string, (config: ServiceConfig) => ServiceAdapter>();

  static registerAdapter(type: string, ctor: (config: ServiceConfig) => ServiceAdapter): void {
    this.customAdapters.set(type, ctor);
  }

  static hasAdapter(type: string): boolean {
    return this.customAdapters.has(type)
      || ['http', 'websocket', 'jsonrpc', 'file', 's3', 'mock', 'plugin', 'mcp'].includes(type);
  }

  static create(name: string, spec: ServiceSpec): Service {
    const svcType = spec.type || spec.adapter;

    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[ServiceFactory] create', name, { svcType });
    }

    if (svcType && this.customAdapters.has(svcType)) {
      const factory = this.customAdapters.get(svcType)!;
      const svcConfig: ServiceConfig = ((spec.config || {}) as ServiceConfig);
      const adapter = factory(svcConfig);
      if (typeof adapter === 'object' && adapter !== null) {
        try { Object.defineProperty(adapter, 'name', { value: name, writable: true, configurable: true }); } catch {}
      }
      return adapter as unknown as Service;
    }

    const { type: _t, adapter: _a, config: nestedCfg, ...flatCfg } = spec;
    const svcConfig: ServiceConfig = nestedCfg ?? (flatCfg as ServiceConfig);

    switch (svcType) {
      case 'http':
        return new HttpService(svcConfig);
      case 'websocket':
        return new WebSocketService(svcConfig as Record<string, unknown> as never);
      case 'jsonrpc':
        return new JSONRPCService(svcConfig);
      case 'file':
        return new FileService(svcConfig);
      case 's3':
        return new S3Service(svcConfig);
      case 'mock':
        return this.buildMockService(svcConfig);
      case 'plugin':
        return this.buildPluginStub(name);
      default:
        throw new Error(`Unknown service type: ${svcType} for service ${name}. Known types: http, websocket, jsonrpc, file, s3, mock, plugin`);
    }
  }

  private static buildMockService(svcConfig: ServiceConfig): Service {
    const mockResponses = ((svcConfig as Record<string, unknown>).responses || {}) as Record<string, unknown>;

    const resolvePath = (obj: unknown, path: string): unknown => {
      if (obj == null) return undefined;
      return path.split('.').reduce((current: unknown, segment: string) => {
        if (current === undefined || current === null) return undefined;
        return (current as Record<string, unknown>)[segment];
      }, obj);
    };

    const resolveTemplate = (value: unknown, request: unknown): unknown => {
      if (typeof value === 'string') {
        return value.replace(/\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s*\}\}/g, (_match, key) => {
          const [root, ...pathParts] = key.split('.');
          const source = root === 'request' ? request : (request as Record<string, unknown>)?.[root];
          const resolved = resolvePath(source, pathParts.join('.'));
          return resolved !== undefined && resolved !== null ? String(resolved) : '';
        });
      }
      if (Array.isArray(value)) return value.map((item) => resolveTemplate(item, request));
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, resolveTemplate(item, request)])
        );
      }
      return value;
    };

    const resolveResponse = async (handler: unknown, request: unknown): Promise<unknown> => {
      const response = typeof handler === 'function' ? await (handler as Function)(request, svcConfig) : handler;
      return resolveTemplate(response, request);
    };

    return {
      async fetch(request: unknown) {
        const response = mockResponses.fetch ?? mockResponses.default;
        return response !== undefined ? resolveResponse(response, request) : { success: true, request };
      },
      async call(method: string, params?: unknown) {
        const response = mockResponses[method] ?? mockResponses.call ?? mockResponses.default;
        const request = { method, params };
        return response !== undefined ? resolveResponse(response, request) : { success: true, method, params };
      },
    } as Service;
  }

  private static buildPluginStub(name: string): Service {
    const pluginError = new Error(
      `Plugin service '${name}' is not installed yet. Install the plugin that provides it before invoking.`
    );
    return {
      name,
      async fetch() { throw pluginError; },
      async call() { throw pluginError; },
      async update() { throw pluginError; },
      async find() { throw pluginError; },
      subscribe() { return { unsubscribe: () => {} }; },
    };
  }
}
