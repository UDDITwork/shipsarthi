/**
 * Request Deduplicator - Prevents duplicate API calls
 * If the same request is made multiple times within a short window,
 * it will only execute once and return the same promise to all callers
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly DEDUP_WINDOW_MS = 2000; // 2 seconds - same request within 2s is considered duplicate

  /**
   * Get or create a request
   * @param key Unique key for the request (e.g., 'GET:/api/users/profile')
   * @param requestFn Function that makes the actual request
   * @returns Promise that resolves to the request result
   */
  async get<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    
    // Check if we have a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending && (now - pending.timestamp) < this.DEDUP_WINDOW_MS) {
      console.log(`🔄 Deduplicating request: ${key} (using existing request)`);
      return pending.promise;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up after request completes (success or error)
      // But keep it for a short time to catch rapid duplicates
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, this.DEDUP_WINDOW_MS);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: now
    });

    return promise;
  }

  /**
   * Clear all pending requests (useful for logout/reset scenarios)
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Clear old requests (cleanup)
   */
  clearOld() {
    const now = Date.now();
    // Use Array.from() to convert iterator to array for ES5 compatibility
    Array.from(this.pendingRequests.entries()).forEach(([key, pending]) => {
      if (now - pending.timestamp > this.DEDUP_WINDOW_MS * 2) {
        this.pendingRequests.delete(key);
      }
    });
  }
}

export const requestDeduplicator = new RequestDeduplicator();

