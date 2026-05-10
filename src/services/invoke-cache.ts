import { sleep } from './sleep.js';

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export class InvokeCache {
  private cache = new Map<string, CacheEntry>();
  private cacheOrder: string[] = [];
  private maxEntries: number;
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;

  constructor(options?: { maxEntries?: number; defaultTTL?: number }) {
    this.maxEntries = options?.maxEntries ?? 1000;
    this.defaultTTL = options?.defaultTTL ?? 5 * 60 * 1000;
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.misses++;
      return undefined;
    }
    this.cacheOrder = this.cacheOrder.filter(k => k !== key);
    this.cacheOrder.push(key);
    this.hits++;
    return entry.value as T;
  }

  getStale<T = unknown>(key: string, maxStaleMs?: number): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    const staleBy = maxStaleMs ?? this.defaultTTL * 6;
    if (Date.now() > entry.expiresAt + staleBy) {
      this.cache.delete(key);
      this.cacheOrder = this.cacheOrder.filter(k => k !== key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, options?: { ttl?: number; maxEntries?: number }): void {
    const ttl = options?.ttl ?? this.defaultTTL;
    const max = options?.maxEntries ?? this.maxEntries;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    };
    if (!this.cache.has(key)) {
      this.cacheOrder.push(key);
    }
    this.cache.set(key, entry as CacheEntry);
    while (this.cacheOrder.length > max) {
      const oldest = this.cacheOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.cacheOrder = this.cacheOrder.filter(k => k !== key);
  }

  invalidateByPrefix(prefix: string): void {
    const toRemove: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) toRemove.push(key);
    }
    for (const key of toRemove) {
      this.cache.delete(key);
    }
    this.cacheOrder = this.cacheOrder.filter(k => !k.startsWith(prefix));
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  stats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
    };
  }

  entries(): ReadonlyMap<string, CacheEntry> {
    return this.cache;
  }

  clear(): void {
    this.cache.clear();
    this.cacheOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  async warm<T>(key: string, fetcher: () => Promise<T>, options?: { ttl?: number }): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await fetcher();
    this.set(key, value, options);
    return value;
  }

  async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; maxStaleMs?: number }
  ): Promise<{ data: T; fromCache: boolean }> {
    const stale = this.getStale<T>(key, options?.maxStaleMs);
    if (stale !== undefined) {
      fetcher().then(v => this.set(key, v, { ttl: options?.ttl })).catch(() => {});
      return { data: stale, fromCache: true };
    }
    const value = await fetcher();
    this.set(key, value, { ttl: options?.ttl });
    return { data: value, fromCache: false };
  }

  getMaxEntries(): number { return this.maxEntries; }

  setMaxEntries(n: number): void {
    this.maxEntries = Math.max(1, n);
    while (this.cacheOrder.length > this.maxEntries) {
      const oldest = this.cacheOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
  }

  getDefaultTTL(): number { return this.defaultTTL; }

  setDefaultTTL(ttl: number): void { this.defaultTTL = Math.max(0, ttl); }
}
