type CacheEntry<T> = { value: T; expiresAt: number };

export type FoodCacheOptions = {
  /** Default TTL for entries (ms). */
  ttlMs: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * In-memory TTL cache for food reads (search / barcode / id).
 * Future: swap backing store without changing {@link FoodProviderClient}.
 */
export class FoodCache {
  private readonly ttlMs: number;
  private readonly search = new Map<string, CacheEntry<unknown>>();
  private readonly barcode = new Map<string, CacheEntry<unknown>>();
  private readonly id = new Map<string, CacheEntry<unknown>>();

  constructor(opts?: Partial<FoodCacheOptions>) {
    this.ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  }

  private now(): number {
    return Date.now();
  }

  private getValid<T>(map: Map<string, CacheEntry<unknown>>, key: string): T | undefined {
    const row = map.get(key);
    if (!row) return undefined;
    if (this.now() >= row.expiresAt) {
      map.delete(key);
      return undefined;
    }
    return row.value as T;
  }

  private set<T>(map: Map<string, CacheEntry<unknown>>, key: string, value: T): void {
    map.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  getSearch<T>(queryNormalized: string): T | undefined {
    return this.getValid<T>(this.search, queryNormalized);
  }

  setSearch<T>(queryNormalized: string, value: T): void {
    this.set(this.search, queryNormalized, value);
  }

  getBarcode<T>(barcode: string): T | undefined {
    return this.getValid<T>(this.barcode, barcode.trim());
  }

  setBarcode<T>(barcode: string, value: T): void {
    this.set(this.barcode, barcode.trim(), value);
  }

  getById<T>(id: string): T | undefined {
    return this.getValid<T>(this.id, id.trim());
  }

  setById<T>(id: string, value: T): void {
    this.set(this.id, id.trim(), value);
  }

  /** Clear all entries (e.g. sign-out). */
  clear(): void {
    this.search.clear();
    this.barcode.clear();
    this.id.clear();
  }
}

let singleton: FoodCache | undefined;

export function getSharedFoodCache(): FoodCache {
  if (!singleton) singleton = new FoodCache();
  return singleton;
}
