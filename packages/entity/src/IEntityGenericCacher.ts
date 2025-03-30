import { IEntityLoadKey, IEntityLoadValue } from './internal/EntityLoadInterfaces';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A generic cacher stores and loads key-value pairs. It also supports negative caching - it stores the absence
 * of keys that don't exist in the backing datastore. It is also responsible for cache key creation.
 */
export default interface IEntityGenericCacher<TFields extends Record<string, any>> {
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
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    value: TLoadValue,
  ): string;

  /**
   * Create a cache key for a load key and load values of an object being invalidated. This is separate
   * from makeCacheKeyForStorage because invalidation should invalidate potential old and new cache keys.
   * This is useful for deployment safety, where some machines may be operating on an old version of the code and
   * thus an old cacheKeyVersion, and some the new version. This method generates cache keys us to invalidate the old caches
   * in addition to the new version from machines on which the new code is deployed.
   *
   * @param key - load key of the cache key
   * @param values - load values of the cache key
   */
  makeCacheKeysForInvalidation<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    value: TLoadValue,
  ): readonly string[];
}
