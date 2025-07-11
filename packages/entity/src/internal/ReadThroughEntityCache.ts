import invariant from 'invariant';

import { EntityConfiguration } from '../EntityConfiguration';
import { IEntityCacheAdapter } from '../IEntityCacheAdapter';
import { IEntityLoadKey, IEntityLoadValue } from './EntityLoadInterfaces';
import { filterMap } from '../utils/collections/maps';

/**
 * @internal
 */
export enum CacheStatus {
  HIT,
  MISS,
  NEGATIVE,
}

/**
 * @internal
 */
export type CacheLoadResult<TFields extends Record<string, any>> =
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
 *
 * @internal
 */
export class ReadThroughEntityCache<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly entityCacheAdapter: IEntityCacheAdapter<TFields, TIDField>,
  ) {}

  private isLoadKeyCacheable<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey): boolean {
    return key.isCacheable(this.entityConfiguration);
  }

  /**
   * Read-through cache function. Steps:
   *
   * 1. Check for cached (key, value) objects
   * 2. Query the fetcher for values not in the cache
   * 3. Cache the results from the fetcher
   * 4. Negatively cache anything missing from the fetcher
   * 5. Return the full set of data for the query.
   *
   * If cache is not applicable for key, return results from fetcher.
   *
   * @param key - load key being queried
   * @param values - load values being queried
   * @param fetcher - closure used to provide underlying data source objects for key and fetcherValues
   * @returns map from value to objects that match the query for that value
   */
  public async readManyThroughAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
    fetcher: (
      fetcherValues: readonly TLoadValue[],
    ) => Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>>,
  ): Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>> {
    // return normal fetch when cache by key not supported
    if (!this.isLoadKeyCacheable(key)) {
      return await fetcher(values);
    }

    const cacheLoadResults = await this.entityCacheAdapter.loadManyAsync(key, values);

    invariant(
      cacheLoadResults.size === values.length,
      `${this.constructor.name} loadMany should return a result for each value`,
    );

    const valuesToFetchFromDB = Array.from(
      filterMap(
        cacheLoadResults,
        (cacheLoadResult) => cacheLoadResult.status === CacheStatus.MISS,
      ).keys(),
    );

    // put transformed cache hits in result map
    const results = key.vendNewLoadValueMap<readonly Readonly<TFields>[]>();
    cacheLoadResults.forEach((cacheLoadResult, value) => {
      if (cacheLoadResult.status === CacheStatus.HIT) {
        results.set(value, [cacheLoadResult.item]);
      }
    });

    // fetch any misses from DB, add DB objects to results, cache DB results, inform cache of any missing DB results
    if (valuesToFetchFromDB.length > 0) {
      const dbFetchResults = await fetcher(valuesToFetchFromDB);

      const valueDBMisses = valuesToFetchFromDB.filter((fv) => {
        const objectsFromFulfillerForFv = dbFetchResults.get(fv);
        return !objectsFromFulfillerForFv || objectsFromFulfillerForFv.length === 0;
      });

      const objectsToCache = key.vendNewLoadValueMap<Readonly<TFields>>();
      for (const [value, objects] of dbFetchResults.entries()) {
        if (objects.length > 1) {
          // multiple objects received for what was supposed to be a unique query, don't add to return map nor cache
          // TODO(wschurman): emit or throw here since console may not be available
          // eslint-disable-next-line no-console
          console.warn(
            `unique key ${key} in table ${
              this.entityConfiguration.tableName
            } returned multiple rows for ${value}`,
          );
          continue;
        }
        const uniqueObject = objects[0];
        if (uniqueObject) {
          objectsToCache.set(value, uniqueObject);
          results.set(value, [uniqueObject]);
        }
      }

      await Promise.all([
        this.entityCacheAdapter.cacheManyAsync(key, objectsToCache),
        this.entityCacheAdapter.cacheDBMissesAsync(key, valueDBMisses),
      ]);
    }

    return results;
  }

  /**
   * Invalidate the cache for objects cached by (key, value).
   *
   * @param key - load key to be invalidated
   * @param values - load values to be invalidated for key
   */
  public async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    // no-op when cache by key not supported
    if (!this.isLoadKeyCacheable(key)) {
      return;
    }

    await this.entityCacheAdapter.invalidateManyAsync(key, values);
  }
}
