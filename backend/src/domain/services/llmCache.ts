/**
 * Simple in-memory cache for LLM results
 * Cache key: vendorId + clientId + serviceId + opportunityContext hash
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class LLMCache {
  private static cache: Map<string, CacheEntry<unknown>> = new Map();
  private static readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate cache key from input parameters
   */
  private static generateKey(
    vendorId: string,
    clientId: string,
    serviceId: string,
    opportunityContext: string
  ): string {
    // Simple hash of opportunity context (first 200 chars for performance)
    const contextHash = opportunityContext.substring(0, 200).split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    return `${vendorId}:${clientId}:${serviceId}:${contextHash}`;
  }

  /**
   * Get cached result if available and not expired
   */
  static get<T>(
    vendorId: string,
    clientId: string,
    serviceId: string,
    opportunityContext: string
  ): T | null {
    const key = this.generateKey(vendorId, clientId, serviceId, opportunityContext);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store result in cache
   */
  static set<T>(
    vendorId: string,
    clientId: string,
    serviceId: string,
    opportunityContext: string,
    data: T
  ): void {
    const key = this.generateKey(vendorId, clientId, serviceId, opportunityContext);
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.TTL_MS,
    });
  }

  /**
   * Clear expired entries (should be called periodically)
   */
  static clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all cache
   */
  static clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  static getStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }
}

