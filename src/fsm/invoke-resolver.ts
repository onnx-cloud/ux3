import path from 'path';
import { pathToFileURL } from 'url';
import type { InvokeService, InvokeSrc } from './types.js';
// Fallback ServiceConfig type for dev when services/type definitions are not present
type ServiceConfig = any;
import { ServiceRegistry } from '../services/registry.js';

export interface ResolveOptions {
  exampleRoot?: string; // absolute path to example directory (where ux/services lives)
  registry?: ServiceRegistry;
  servicesConfig?: Record<string, ServiceConfig>;
  servicesClient?: {
    invoke: (service: string, method: string, input?: any) => Promise<any>;
  };
}

function isFunction(value: any): value is (...args: any[]) => any {
  return typeof value === 'function';
}

export async function resolveInvoke(
  invoke: string | InvokeSrc | InvokeService | ((...args: any[]) => any),
  options: ResolveOptions = {}
): Promise<(...args: any[]) => Promise<any>> {
  // Direct function
  if (isFunction(invoke)) {
    return async (input?: any) => Promise.resolve(invoke(input));
  }

  // If it's an object with `src` or `service`
  if (typeof invoke === 'object' && invoke !== null) {
    const maybeSrc = (invoke as InvokeSrc).src;
    if (maybeSrc) {
      return resolveInvoke(maybeSrc, options);
    }

    const chan = (invoke as InvokeService).service;
    if (chan) {
      const method = (invoke as InvokeService).method || 'GET';
      // Validate service exists if config provided
      if (options.servicesConfig && !(chan in options.servicesConfig)) {
        throw new Error(`Service not found: ${chan}`);
      }

      return async (input?: any) => {
        if (!options.servicesClient) {
          throw new Error(
            `No services client supplied to invoke service '${chan}'. Provide a servicesClient with an 'invoke' method.`
          );
        }

        return options.servicesClient.invoke(chan, method, input);
      };
    }
  }

  // String name: try registry first
  if (typeof invoke === 'string') {
    const name = invoke;

    if (options.registry) {
      const fn = options.registry.resolve(name);
      if (fn) return fn;
    }

    // Attempt to resolve from example's ux/services
    if (options.exampleRoot) {
      const servicePaths = [
        path.join(options.exampleRoot, 'ux/services/index.mjs'),
        path.join(options.exampleRoot, 'ux/services/index.js'),
        path.join(options.exampleRoot, 'ux/services.js'),
        path.join(options.exampleRoot, 'ux/services/index.cjs'),
      ];

      for (const servicePath of servicePaths) {
        try {
          // dynamic import via file URL
          const mod = await import(pathToFileURL(servicePath).href) as Record<string, unknown>;
          if (name in mod && isFunction(mod[name])) {
            // wrap to always return a promise
            const fn = mod[name] as (input: unknown) => unknown;
            return async (input?: unknown) => Promise.resolve(fn(input));
          }
        } catch (err) {
          // ignore missing file errors and try next path
          // but surface parse/runtime errors
          if (err instanceof Error) {
            const code = (err as Error & { code?: string }).code;
            if (code && code !== 'ERR_MODULE_NOT_FOUND' && code !== 'ENOENT') {
              // non-not-found error - rethrow
              throw err;
            }
          } else {
            // re-throw unknown error types
            throw err;
          }
        }
      }
    }

    throw new Error(`Unable to resolve invoke source: '${name}'`);
  }

  throw new Error('Unsupported invoke configuration');
}
