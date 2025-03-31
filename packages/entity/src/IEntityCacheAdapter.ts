import { IEntityLoadKey, IEntityLoadValue } from './internal/EntityLoadInterfaces';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A cache adapter is an interface by which objects can be
 * cached, fetched from cache, and removed from cache (invalidated).
 */
export default interface IEntityCacheAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  /**
   * Load many objects from cache.
   * @param key - load key to load
   * @param values - load values to load for the key
   * @returns map from all load values to a CacheLoadResult for that value
   */
  loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>>;

  /**
   * Cache many objects fetched from the DB.
   * @param key - load key to cache
   * @param objectMap - map from load value to object to cache for the key
   */
  cacheManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>,
  ): Promise<void>;

  /**
   * Negatively cache objects that could not be found in the cache or DB.
   * @param key - load key to cache misses for
   * @param values - load values for objects reported as CacheStatus.NEGATIVE
   *                 in the cache and not found in the DB.
   */
  cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<void>;

  /**
   * Invalidate the cache for objects cached by (key, value).
   * @param key - load key to invalidate
   * @param values - load values to be invalidated for the key
   */
  invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<void>;
}
