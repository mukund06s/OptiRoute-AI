/**
 * Weather Cache Service
 * In-memory cache with TTL, expiration, and statistics
 */

export interface CachedWeather {
  data: any;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class WeatherCache {
  private cache: Map<string, CachedWeather>;
  private ttlMs: number;
  private stats: { hits: number; misses: number };

  constructor(ttlMinutes: number = 30) {
    this.cache = new Map();
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.stats = { hits: 0, misses: 0 };

    this.startExpirationCheck();
  }

  private getCacheKey(hubId: number): string {
    return `weather:hub:${hubId}`;
  }

  set(hubId: number, data: any): void {
    const key = this.getCacheKey(hubId);
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.ttlMs,
    });
  }

  get(hubId: number): any | null {
    const key = this.getCacheKey(hubId);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now >= cached.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.data;
  }

  has(hubId: number): boolean {
    const key = this.getCacheKey(hubId);
    const cached = this.cache.get(key);

    if (!cached) {
      return false;
    }

    const now = Date.now();
    if (now >= cached.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidate(hubId: number): boolean {
    const key = this.getCacheKey(hubId);
    return this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  private startExpirationCheck(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (now >= cached.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const weatherCache = new WeatherCache(30);
