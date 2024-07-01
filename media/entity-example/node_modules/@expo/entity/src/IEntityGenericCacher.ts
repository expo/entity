import { CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A generic cacher stores and loads key-value pairs. It also supports negative caching - it stores the absence
 * of keys that don't exist in the backing datastore. It is also responsible for cache key creation.
 */
export default interface IEntityGenericCacher<TFields> {
  /**
   * Load many keys from the cache. Return info in a format that is useful for read-through caching and
   * negative caching.
   *
   * @param keys - cache keys to load
   */
  loadManyAsync(keys: readonly string[]): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>>;

  /**
   * Cache many objects for specified keys.
   *
   * @param objectMap - map from cache key to object to cache for key
   */
  cacheManyAsync(objectMap: ReadonlyMap<string, Readonly<TFields>>): Promise<void>;

  /**
   * Negatively-cache specified keys. Subsequent loads for these keys (without calling invalidate) may
   * return a negative CacheLoadResult
   *
   * @param keys - keys to cache negatively
   */
  cacheDBMissesAsync(keys: readonly string[]): Promise<void>;

  /**
   * Invalidate specified keys in cache. Subsequent loads for these keys may return a cache miss.
   *
   * @param keys - keys to invalidate
   */
  invalidateManyAsync(keys: readonly string[]): Promise<void>;

  /**
   * Create a cache key for a field and value of a object being cached or invalidated.
   *
   * @param fieldName - name of the object field for this cache key
   * @param fieldValue - value of the obejct field for this cache key
   */
  makeCacheKey<N extends keyof TFields>(fieldName: N, fieldValue: NonNullable<TFields[N]>): string;
}
