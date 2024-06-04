import invariant from 'invariant';

import EntityConfiguration from '../EntityConfiguration';
import IEntityCacheAdapter from '../IEntityCacheAdapter';
import { filterMap } from '../utils/collections/maps';

export enum CacheStatus {
  HIT,
  MISS,
  NEGATIVE,
}

export type CacheLoadResult<TFields> =
  | {
      status: CacheStatus.HIT;
      item: Readonly<TFields>;
    }
  | {
      status: CacheStatus.MISS;
    }
  | {
      status: CacheStatus.NEGATIVE;
    };

/**
 * A read-through entity cache is responsible for coordinating EntityDatabaseAdapter and
 * EntityCacheAdapter within the EntityDataManager.
 */
export default class ReadThroughEntityCache<TFields extends Record<string, any>> {
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly entityCacheAdapter: IEntityCacheAdapter<TFields>
  ) {}

  private isFieldCacheable<N extends keyof TFields>(fieldName: N): boolean {
    return this.entityConfiguration.cacheableKeys.has(fieldName);
  }

  /**
   * Read-through cache function. Steps:
   *
   * 1. Check for cached (fieldName, fieldValue) objects
   * 2. Query the fetcher for fieldValues not in the cache
   * 3. Cache the results from the fetcher
   * 4. Negatively cache anything missing from the fetcher
   * 5. Return the full set of data for the query.
   *
   * If cache is not applicable for fieldName, return results from fetcher.
   *
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values being queried
   * @param fetcher - closure used to provide underlying data source objects for fieldName and fetcherFieldValues
   * @returns map from fieldValue to objects that match the query for that fieldValue
   */
  public async readManyThroughAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
    fetcher: (
      fetcherFieldValues: readonly NonNullable<TFields[N]>[]
    ) => Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>>
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    // return normal fetch when cache by fieldName not supported
    if (!this.isFieldCacheable(fieldName)) {
      return await fetcher(fieldValues);
    }

    const cacheLoadResults = await this.entityCacheAdapter.loadManyAsync(fieldName, fieldValues);

    invariant(
      cacheLoadResults.size === fieldValues.length,
      `${this.constructor.name} loadMany should return a result for each fieldValue`
    );

    const fieldValuesToFetchFromDB = Array.from(
      filterMap(
        cacheLoadResults,
        (cacheLoadResult) => cacheLoadResult.status === CacheStatus.MISS
      ).keys()
    );

    // put transformed cache hits in result map
    const results: Map<NonNullable<TFields[N]>, readonly Readonly<TFields>[]> = new Map();
    cacheLoadResults.forEach((cacheLoadResult, fieldValue) => {
      if (cacheLoadResult.status === CacheStatus.HIT) {
        results.set(fieldValue, [cacheLoadResult.item]);
      }
    });

    // fetch any misses from DB, add DB objects to results, cache DB results, inform cache of any missing DB results
    if (fieldValuesToFetchFromDB.length > 0) {
      const dbFetchResults = await fetcher(fieldValuesToFetchFromDB);

      const fieldValueDBMisses = fieldValuesToFetchFromDB.filter((fv) => {
        const objectsFromFulfillerForFv = dbFetchResults.get(fv);
        return !objectsFromFulfillerForFv || objectsFromFulfillerForFv.length === 0;
      });

      const objectsToCache: Map<NonNullable<TFields[N]>, Readonly<TFields>> = new Map();
      for (const [fieldValue, objects] of dbFetchResults.entries()) {
        if (objects.length > 1) {
          // multiple objects received for what was supposed to be a unique query, don't add to return map nor cache
          // TODO(wschurman): emit or throw here since console may not be available
          // eslint-disable-next-line no-console
          console.warn(
            `unique key ${String(fieldName)} in ${
              this.entityConfiguration.tableName
            } returned multiple rows for ${fieldValue}`
          );
          continue;
        }
        const uniqueObject = objects[0];
        if (uniqueObject) {
          objectsToCache.set(fieldValue, uniqueObject);
          results.set(fieldValue, [uniqueObject]);
        }
      }

      await Promise.all([
        this.entityCacheAdapter.cacheManyAsync(fieldName, objectsToCache),
        this.entityCacheAdapter.cacheDBMissesAsync(fieldName, fieldValueDBMisses),
      ]);
    }

    return results;
  }

  /**
   * Invalidate the cache for objects cached by (fieldName, fieldValue).
   *
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values to be invalidated
   */
  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    // no-op when cache by fieldName not supported
    if (!this.isFieldCacheable(fieldName)) {
      return;
    }

    await this.entityCacheAdapter.invalidateManyAsync(fieldName, fieldValues);
  }
}
