/**
 * Simple data cache utility to persist data in localStorage
 * This ensures the app works seamlessly even when API fails
 */

const CACHE_PREFIX = 'app_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class DataCache {
  /**
   * Save data to cache with TTL
   */
  static set<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
    } catch (error) {
      console.warn('Failed to cache data:', error);
      // Ignore cache errors - app should still work
    }
  }

  /**
   * Get data from cache if still valid
   */
  static get<T>(key: string): T | null {
    try {
      const cachedStr = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cachedStr) return null;

      const cached: CachedData<T> = JSON.parse(cachedStr);
      const age = Date.now() - cached.timestamp;

      if (age > cached.ttl) {
        // Cache expired, remove it
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Failed to read cache:', error);
      return null;
    }
  }

  /**
   * Get data from cache even if expired (for fallback)
   */
  static getStale<T>(key: string): T | null {
    try {
      const cachedStr = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cachedStr) return null;

      const cached: CachedData<T> = JSON.parse(cachedStr);
      return cached.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear specific cache key
   */
  static clear(key: string): void {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }

  /**
   * Clear all app caches
   */
  static clearAll(): void {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}
