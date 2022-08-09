import EntityConfiguration from './EntityConfiguration';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A cache adapter is an interface by which objects can be
 * cached, fetched from cache, and removed from cache (invalidated).
 */
export default abstract class EntityCacheAdapter<TFields> {
  constructor(protected readonly entityConfiguration: EntityConfiguration<TFields>) {}

  /**
   * Load many objects from cache.
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from all field values to a CacheLoadResult for each input value
   */
  public abstract loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>>;

  /**
   * Cache many objects fetched from the DB.
   * @param fieldName - object field being queried
   * @param objectMap - map from field value to object to cache
   */
  public abstract cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void>;

  /**
   * Negatively cache objects that could not be found in the cache or DB.
   * @param fieldName - object field being queried
   * @param fieldValues - fieldValues for objects reported as CacheStatus.NEGATIVE
   *                    in the cache and not found in the DB.
   */
  public abstract cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void>;

  /**
   * Invalidate the cache for objects cached by (fieldName, fieldValue).
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values to be invalidated
   */
  public abstract invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void>;
}
