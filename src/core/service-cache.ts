/**
 * Service Cache Framework - Phase 1.1
 * Generic caching system with TTL support for service responses
 */

/**
 * Observer function called when cache is invalidated
 */
export type Observer<T> = (cache: ServiceCache<T>) => void;

/**
 * Generic service cache with TTL (Time-To-Live) support
 *
 * Features:
 * - TTL-based expiration with millisecond precision
 * - Manual invalidation with observer notification
 * - Staleness detection
 * - Full type safety with generics
 *
 * @template T - The type of value being cached
 *
 * @example
 * const cache = new ServiceCache<User>(60000); // 60 second TTL
 * cache.set({ id: 1, name: 'Alice' });
 * if (!cache.isStale()) {
 *   const user = cache.get(); // Returns the cached user
 * }
 * cache.observeInvalidation(() => {
 *   console.log('Cache was invalidated');
 * });
 */
export class ServiceCache<T> {
  private value: T | null = null;
  private expiresAt: number = 0;
  private observers: Observer<T>[] = [];

  /**
   * Create a new service cache
   * @param ttlMs - Time-to-live in milliseconds
   */
  constructor(private ttlMs: number) {
    if (ttlMs < 0) {
      throw new Error('TTL must be non-negative');
    }
  }

  /**
   * Store a value in the cache
   * Resets the expiration timer
   *
   * @param value - The value to cache
   */
  set(value: T): void {
    this.value = value;
    this.expiresAt = Date.now() + this.ttlMs;
  }

  /**
   * Retrieve the cached value
   * Returns null if cache is stale or empty
   *
   * @returns The cached value or null if stale/empty
   */
  get(): T | null {
    if (this.isStale()) {
      return null;
    }
    return this.value;
  }

  /**
   * Retrieve the cached value
   * Returns undefined if cache is stale or empty (alternative to get())
   *
   * @returns The cached value or undefined if stale/empty
   */
  getOrUndefined(): T | undefined {
    if (this.isStale()) {
      return undefined;
    }
    return this.value || undefined;
  }

  /**
   * Check if the cached value has expired
   * Returns true if no value is set or if TTL has been exceeded
   *
   * @returns true if cache is stale/expired, false if valid
   */
  isStale(): boolean {
    if (this.value === null) {
      return true;
    }
    return Date.now() > this.expiresAt;
  }

  /**
   * Invalidate the cache and optionally notify observers
   * Clears the cached value and resets expiration
   *
   * @param notifyObservers - Whether to notify registered observers (default: true)
   */
  invalidate(notifyObservers: boolean = true): void {
    this.value = null;
    this.expiresAt = 0;
    if (notifyObservers) {
      this.notifyObservers();
    }
  }

  /**
   * Register an observer to be notified when cache is invalidated
   * Multiple observers can be registered for the same cache
   *
   * @param observer - Callback function to invoke on invalidation
   */
  observeInvalidation(observer: Observer<T>): void {
    this.observers.push(observer);
  }

  /**
   * Remove a previously registered observer
   *
   * @param observer - The observer function to remove
   */
  removeObserver(observer: Observer<T>): void {
    const index = this.observers.indexOf(observer);
    if (index >= 0) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Clear all observers
   */
  clearObservers(): void {
    this.observers = [];
  }

  /**
   * Clear the cache and optionally notify observers
   * Equivalent to invalidate() - clears both value and observers list
   *
   * @param notifyObservers - Whether to notify registered observers (default: true)
   */
  clear(notifyObservers: boolean = true): void {
    const hadValue = this.value !== null;
    this.value = null;
    this.expiresAt = 0;
    if (notifyObservers && hadValue) {
      this.notifyObservers();
    }
  }

  /**
   * Get the remaining TTL in milliseconds
   * Returns 0 if cache is stale or empty
   *
   * @returns Milliseconds until expiration (0 if stale)
   */
  getRemainingTTL(): number {
    if (this.isStale()) {
      return 0;
    }
    const remaining = this.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get the total configured TTL in milliseconds
   *
   * @returns The TTL value passed to constructor
   */
  getTTL(): number {
    return this.ttlMs;
  }

  /**
   * Check if cache has a valid value (not stale, not empty)
   *
   * @returns true if cache has a valid value, false otherwise
   */
  hasValue(): boolean {
    return !this.isStale();
  }

  /**
   * Notify all registered observers of invalidation
   * Called internally when cache is invalidated
   */
  private notifyObservers(): void {
    for (const observer of this.observers) {
      try {
        observer(this);
      } catch (error) {
        // Log error but don't throw - observers shouldn't block cache operations
        console.error('[ServiceCache] Observer error:', error);
      }
    }
  }
}
