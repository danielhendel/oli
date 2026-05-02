/**
 * Tiny process-local TTL cache for Nutritionix-backed reads (cost / rate control).
 * Keys must not contain user PII (food ids, normalized queries, UPC digits only).
 */

type CacheEntry<T> = { value: T; expiresAtMs: number };

const DEFAULT_MAX_ENTRIES = 800;

export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const row = this.store.get(key);
    if (!row) return undefined;
    if (Date.now() >= row.expiresAtMs) {
      this.store.delete(key);
      return undefined;
    }
    return row.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const first = this.store.keys().next().value as string | undefined;
      if (first) this.store.delete(first);
    }
    this.store.set(key, { value, expiresAtMs: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

/** Normalize search query for cache keys (lowercase trim, collapse whitespace). */
export function normalizeSearchCacheKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}
