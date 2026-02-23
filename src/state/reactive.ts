/**
 * Reactive Signals - Lightweight reactive state (~1KB gzipped)
 * 
 * Based on solid.js signal model with auto-tracking via Proxy
 * No dependencies, native browser APIs only
 * 
 * @example
 * ```typescript
 * const state = reactive({ count: 0, name: 'Alice' });
 * 
 * effect(() => {
 *   console.log(`Count is: ${state.count}`);
 * });
 * 
 * state.count++; // triggers effect
 * ```
 */

type EffectFn = () => void;
type Cleanup = () => void;

interface SignalTrackingContext {
  currentEffect?: EffectFn;
}

/**
 * Global tracking context for effect subscriptions
 */
const trackingContext: SignalTrackingContext = {};

/**
 * Set of effects currently subscribed to this signal, separated by value and keys
 */
type SubscriberSets = { value: Set<EffectFn>; keys: Set<EffectFn> };
const signalSubscribers = new WeakMap<object, SubscriberSets>();
const reactiveProxies = new WeakMap<object, any>();

/**
 * Create a reactive object with automatic dependency tracking
 * 
 * Returns a Proxy that:
 * - Tracks property access in effects
 * - Notifies subscribers on changes
 * - Supports nested objects
 */
export function reactive<T extends object>(target: T): T {
  // Return cached proxy if already created
  if (reactiveProxies.has(target)) {
    return reactiveProxies.get(target);
  }

  const subscribers: SubscriberSets = { value: new Set(), keys: new Set() };
  signalSubscribers.set(target, subscribers);

  const proxy = new Proxy(target, {
    get(target: any, prop: PropertyKey) {
      // Track value access for current effect
      if (trackingContext.currentEffect) {
        subscribers.value.add(trackingContext.currentEffect);
        // DEBUG log
        console.log('[reactive] subscribe value', String(prop), subscribers.value.size);
      }
      const value = Reflect.get(target, prop);
      // Proxy nested objects for deep reactivity
      if (value !== null && typeof value === 'object') {
        return reactive(value);
      }
      return value;
    },

    set(target: any, prop: PropertyKey, value: any) {
      // Pre-set debug
      console.log('[reactive] set called for', String(prop));

      const oldHas = Object.prototype.hasOwnProperty.call(target, prop);
      const oldValue = Reflect.get(target, prop);
      
      // Skip if value unchanged
      if (oldValue === value) {
        return true;
      }

      const result = Reflect.set(target, prop, value);

      const newHas = Object.prototype.hasOwnProperty.call(target, prop);

      // DEBUG log
      console.log('[reactive] notify', String(prop), 'valueSubs=', subscribers.value.size, 'keySubs=', subscribers.keys.size);

      // Notify value subscribers
      subscribers.value.forEach((effect) => queueEffect(effect));

      // Notify key subscribers only if keys changed (add/remove)
      if (oldHas !== newHas) {
        subscribers.keys.forEach((effect) => queueEffect(effect));
      }

      return result;
    },


    has(target: any, prop: PropertyKey) {
      if (trackingContext.currentEffect) {
        subscribers.keys.add(trackingContext.currentEffect);
      }
      return Reflect.has(target, prop);
    },

    ownKeys(target: any) {
      if (trackingContext.currentEffect) {
        subscribers.keys.add(trackingContext.currentEffect);
      }
      return Reflect.ownKeys(target);
    },
  }) as T;
  reactiveProxies.set(target, proxy);
  return proxy;
}

/**
 * Track property accesses and subscribe to changes
 * 
 * Effect runs immediately and again whenever dependencies change
 * 
 * @returns cleanup function to unsubscribe
 */
export function effect(fn: EffectFn): Cleanup {
  const prevEffect = trackingContext.currentEffect;

  try {
    trackingContext.currentEffect = fn;
    fn();
  } finally {
    trackingContext.currentEffect = prevEffect;
  }

  return () => {
    // TODO: cleanup implementation (remove from all subscriber sets)
  };
}

/**
 * Batch effect updates to reduce re-renders
 * All state changes within callback are batched into single effect run
 */
export function batch(fn: () => void): void {
  fn();
  // TODO: Implement batching with microtask queue
}

/**
 * Queue effect execution (with deduplication)
 */
const effectQueue = new Set<EffectFn>();
let flushScheduled = false;

function queueEffect(effect: EffectFn): void {
  effectQueue.add(effect);
  
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      const queue = Array.from(effectQueue);
      effectQueue.clear();
      queue.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error('[UX3] Effect error:', e);
        }
      });
    });
  }
}

/**
 * Computed value - reactive derivation
 * Automatically tracks dependencies and caches result
 */
export function computed<T>(fn: () => T): () => T {
  let cachedValue: T;
  let dirty = true;
  const computedSubscribers = new Set<EffectFn>();

  const invalidate = () => {
    if (!dirty) {
      dirty = true;
      // notify subscribers who depend on this computed
      computedSubscribers.forEach((effect) => queueEffect(effect));
    }
  };

  const compute = () => {
    // If an outer effect is reading this computed, subscribe it
    if (trackingContext.currentEffect) {
      computedSubscribers.add(trackingContext.currentEffect);
    }

    if (dirty) {
      const prevEffect = trackingContext.currentEffect;
      // While computing, register invalidate on dependencies (not compute)
      trackingContext.currentEffect = invalidate;
      cachedValue = fn();
      trackingContext.currentEffect = prevEffect;
      dirty = false;
    }

    return cachedValue;
  };

  return compute;
}
