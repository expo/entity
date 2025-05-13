import { IEntityLoadKey, IEntityLoadValue } from './internal/EntityLoadInterfaces';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A generic cacher stores and loads key-value pairs. It also supports negative caching - it stores the absence
 * of keys that don't exist in the backing datastore. It is also responsible for cache key creation.
 */
export default interface IEntityGenericCacher<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
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
   * Create a cache key for a load key and load value of an object being cached (or negatively cached).
   *
   * @param key - load key of the cache key
   * @param value - load value of the cache key
   */
  makeCacheKeyForStorage<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    value: TLoadValue,
  ): string;

  /**
   * Create a cache key for a load key and load values of an object being invalidated. This is separate
   * from makeCacheKeyForStorage because invalidation can optionally be configured to invalidate a larger set of keys than
   * the one for just the current cache version, which can be useful for things like push safety.
   *
   * @param key - load key for the cache keys
   * @param value - load value for the cache keys
   */
  makeCacheKeysForInvalidation<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    value: TLoadValue,
  ): readonly string[];
}
