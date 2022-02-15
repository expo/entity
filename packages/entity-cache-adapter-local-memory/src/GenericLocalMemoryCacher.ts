import { CacheLoadResult, CacheStatus } from '@expo/entity';
import LRUCache from 'lru-cache';

// Sentinel value we store in local memory to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
export const DOES_NOT_EXIST_LOCAL_MEMORY_CACHE = Symbol('doesNotExist');
type LocalMemoryCacheValue<TFields> = Readonly<TFields> | typeof DOES_NOT_EXIST_LOCAL_MEMORY_CACHE;
export type LocalMemoryCache<TFields> = LRUCache<string, LocalMemoryCacheValue<TFields>>;

type LRUCacheOptionsV7<K, V> = {
  // the number of most recently used items to keep.
  // note that we may store fewer items than this if maxSize is hit.
  max: number;

  // if you wish to track item size, you must provide a maxSize
  // note that we still will only keep up to max *actual items*,
  // so size tracking may cause fewer than max items to be stored.
  // At the extreme, a single item of maxSize size will cause everything
  // else in the cache to be dropped when it is added.  Use with caution!
  // Note also that size tracking can negatively impact performance,
  // though for most cases, only minimally.
  maxSize?: number;

  // function to calculate size of items.  useful if storing strings or
  // buffers or other items where memory size depends on the object itself.
  // also note that oversized items do NOT immediately get dropped from
  // the cache, though they will cause faster turnover in the storage.
  sizeCalculation?: (value: V, key: K) => number;

  // function to call when the item is removed from the cache
  // Note that using this can negatively impact performance.
  dispose?: (value: V, key: K) => void;

  // max time to live for items before they are considered stale
  // note that stale items are NOT preemptively removed by default,
  // and MAY live in the cache, contributing to its LRU max, long after
  // they have expired.
  // Also, as this cache is optimized for LRU/MRU operations, some of
  // the staleness/TTL checks will reduce performance, as they will incur
  // overhead by deleting items.
  // Must be a positive integer in ms, defaults to 0, which means "no TTL"
  ttl?: number;

  // return stale items from cache.get() before disposing of them
  // boolean, default false
  allowStale?: boolean;

  // update the age of items on cache.get(), renewing their TTL
  // boolean, default false
  updateAgeOnGet?: boolean;

  // update the age of items on cache.has(), renewing their TTL
  // boolean, default false
  updateAgeOnHas?: boolean;

  // update the "recently-used"-ness of items on cache.has()
  // boolean, default false
  updateRecencyOnHas?: boolean;
};

export default class GenericLocalMemoryCacher<TFields> {
  constructor(private readonly lruCache: LocalMemoryCache<TFields>) {}

  static createLRUCache<TFields>(
    options: { maxSize?: number; ttlSeconds?: number } = {}
  ): LocalMemoryCache<TFields> {
    const LRU_CACHE_MAX_AGE_SECONDS = 10;
    const ENTITIES_LRU_CACHE_SIZE = 10000;
    const maxAgeSeconds = options.ttlSeconds ?? LRU_CACHE_MAX_AGE_SECONDS;
    const lruCacheOptions: LRUCacheOptionsV7<string, TFields> = {
      max: options.maxSize ?? ENTITIES_LRU_CACHE_SIZE,
      sizeCalculation: (value: LocalMemoryCacheValue<TFields>) =>
        value === DOES_NOT_EXIST_LOCAL_MEMORY_CACHE ? 0 : 1,
      ttl: maxAgeSeconds * 1000, // convert to ms
    };
    return new LRUCache<string, LocalMemoryCacheValue<TFields>>(lruCacheOptions as any);
  }

  static createNoOpLRUCache<TFields>(): LocalMemoryCache<TFields> {
    return new LRUCache<string, LocalMemoryCacheValue<TFields>>({
      max: 0,
      maxAge: -1,
    });
  }

  public async loadManyAsync(
    keys: readonly string[]
  ): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>> {
    const cacheResults = new Map<string, CacheLoadResult<TFields>>();
    for (const key of keys) {
      const cacheResult = this.lruCache.get(key);
      if (cacheResult === DOES_NOT_EXIST_LOCAL_MEMORY_CACHE) {
        cacheResults.set(key, {
          status: CacheStatus.NEGATIVE,
        });
      } else if (cacheResult) {
        cacheResults.set(key, {
          status: CacheStatus.HIT,
          item: cacheResult as unknown as TFields,
        });
      } else {
        cacheResults.set(key, {
          status: CacheStatus.MISS,
        });
      }
    }
    return cacheResults;
  }

  public async cacheManyAsync(objectMap: ReadonlyMap<string, Readonly<TFields>>): Promise<void> {
    for (const [key, item] of objectMap) {
      this.lruCache.set(key, item);
    }
  }

  public async cacheDBMissesAsync(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.lruCache.set(key, DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);
    }
  }

  public async invalidateManyAsync(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.lruCache.del(key);
    }
  }

  public makeCacheKey(parts: string[]): string {
    const delimiter = ':';
    const escapedParts = parts.map((part) =>
      part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
    );
    return escapedParts.join(delimiter);
  }
}
