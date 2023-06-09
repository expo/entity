import nullthrows from 'nullthrows';

import IEntityCacheAdapter from './IEntityCacheAdapter';
import { CacheStatus, CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A IEntityCacheAdapter that composes other IEntityCacheAdapter instances.
 */
export default class ComposedEntityCacheAdapter<TFields> implements IEntityCacheAdapter<TFields> {
  /**
   * @param cacheAdapters - list of cache adapters to compose in order of precedence.
   *                        Earlier cache adapters are read from first and written to (including invalidations) last.
   *                        Typically, caches closer to the application should be ordered before caches closer to the database.
   *                        A lower layer cache is closer to the database, while a higher layer cache is closer to the application.
   */
  constructor(private readonly cacheAdapters: IEntityCacheAdapter<TFields>[]) {}

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const retMap = new Map<NonNullable<TFields[N]>, CacheLoadResult<TFields>>();
    const fulfilledFieldValuesByCacheIndex: NonNullable<TFields[N]>[][] = Array.from(
      { length: this.cacheAdapters.length },
      () => []
    );

    let unfulfilledFieldValues = fieldValues;
    for (let i = 0; i < this.cacheAdapters.length; i++) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      const cacheResultsFromAdapter = await cacheAdapter.loadManyAsync(
        fieldName,
        unfulfilledFieldValues
      );

      const newUnfulfilledFieldValues = [];
      for (const [fieldValue, cacheResult] of cacheResultsFromAdapter) {
        if (cacheResult.status === CacheStatus.MISS) {
          newUnfulfilledFieldValues.push(fieldValue);
        } else {
          retMap.set(fieldValue, cacheResult);
          nullthrows(fulfilledFieldValuesByCacheIndex[i]).push(fieldValue);
        }
      }
      unfulfilledFieldValues = newUnfulfilledFieldValues;
      if (unfulfilledFieldValues.length === 0) {
        break;
      }
    }

    // Recache values from lower layers that were not found in higher layers
    // Write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      const hitsToCache = new Map<NonNullable<TFields[N]>, Readonly<TFields>>();
      const negativesToCache: NonNullable<TFields[N]>[] = [];

      // Loop over all lower layer caches to collect hits and misses
      for (let j = i + 1; j < this.cacheAdapters.length; j++) {
        const fulfilledFieldValues = nullthrows(fulfilledFieldValuesByCacheIndex[j]);
        fulfilledFieldValues.forEach((fieldValue) => {
          const cacheResult = nullthrows(retMap.get(fieldValue));
          if (cacheResult.status === CacheStatus.HIT) {
            hitsToCache.set(fieldValue, cacheResult.item);
          } else if (cacheResult.status === CacheStatus.NEGATIVE) {
            negativesToCache.push(fieldValue);
          }
        });
      }

      const promises = [];
      if (hitsToCache.size > 0) {
        promises.push(cacheAdapter.cacheManyAsync(fieldName, hitsToCache));
      }
      if (negativesToCache.length > 0) {
        promises.push(cacheAdapter.cacheDBMissesAsync(fieldName, negativesToCache));
      }
      await Promise.all(promises);
    }

    for (const fieldValue of unfulfilledFieldValues) {
      retMap.set(fieldValue, { status: CacheStatus.MISS });
    }

    return retMap;
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheManyAsync(fieldName, objectMap);
    }
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheDBMissesAsync(fieldName, fieldValues);
    }
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    // delete from lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.invalidateManyAsync(fieldName, fieldValues);
    }
  }
}
