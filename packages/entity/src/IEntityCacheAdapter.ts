import { IEntityLoadKey, IEntityLoadValue } from './internal/EntityAdapterLoadInterfaces';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A cache adapter is an interface by which objects can be
 * cached, fetched from cache, and removed from cache (invalidated).
 */
export default interface IEntityCacheAdapter<TFields extends Record<string, any>> {
  /**
   * Load many objects from cache.
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from all field values to a CacheLoadResult for each input value
   */
  loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>>;

  /**
   * Cache many objects fetched from the DB.
   * @param fieldName - object field being queried
   * @param objectMap - map from field value to object to cache
   */
  cacheManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>,
  ): Promise<void>;

  /**
   * Negatively cache objects that could not be found in the cache or DB.
   * @param fieldName - object field being queried
   * @param fieldValues - fieldValues for objects reported as CacheStatus.NEGATIVE
   *                    in the cache and not found in the DB.
   */
  cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<void>;

  /**
   * Invalidate the cache for objects cached by (fieldName, fieldValue).
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values to be invalidated
   */
  invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<void>;
}
