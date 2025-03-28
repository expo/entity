import nullthrows from 'nullthrows';

import IEntityCacheAdapter from './IEntityCacheAdapter';
import { IEntityLoadKey, IEntityLoadValue } from './internal/EntityLoadInterfaces';
import { CacheStatus, CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A IEntityCacheAdapter that composes other IEntityCacheAdapter instances.
 */
export default class ComposedEntityCacheAdapter<TFields extends Record<string, any>>
  implements IEntityCacheAdapter<TFields>
{
  /**
   * @param cacheAdapters - list of cache adapters to compose in order of precedence.
   *                        Earlier cache adapters are read from first and written to (including invalidations) last.
   *                        Typically, caches closer to the application should be ordered before caches closer to the database.
   *                        A lower layer cache is closer to the database, while a higher layer cache is closer to the application.
   */
  constructor(private readonly cacheAdapters: IEntityCacheAdapter<TFields>[]) {}

  public async loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>> {
    const retMap = key.vendNewLoadValueMap<CacheLoadResult<TFields>>();
    const fulfilledValuesByCacheIndex: TLoadValue[][] = Array.from(
      { length: this.cacheAdapters.length },
      () => [],
    );

    let unfulfilledValues = values;
    for (let i = 0; i < this.cacheAdapters.length; i++) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      const cacheResultsFromAdapter = await cacheAdapter.loadManyAsync(key, unfulfilledValues);

      const newUnfulfilledValues = [];
      for (const [value, cacheResult] of cacheResultsFromAdapter) {
        if (cacheResult.status === CacheStatus.MISS) {
          newUnfulfilledValues.push(value);
        } else {
          retMap.set(value, cacheResult);
          nullthrows(fulfilledValuesByCacheIndex[i]).push(value);
        }
      }
      unfulfilledValues = newUnfulfilledValues;
      if (unfulfilledValues.length === 0) {
        break;
      }
    }

    // Recache values from lower layers that were not found in higher layers
    // Write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      const hitsToCache = key.vendNewLoadValueMap<Readonly<TFields>>();
      const negativesToCache: TLoadValue[] = [];

      // Loop over all lower layer caches to collect hits and misses
      for (let j = i + 1; j < this.cacheAdapters.length; j++) {
        const fulfilledValues = nullthrows(fulfilledValuesByCacheIndex[j]);
        fulfilledValues.forEach((value) => {
          const cacheResult = nullthrows(retMap.get(value));
          if (cacheResult.status === CacheStatus.HIT) {
            hitsToCache.set(value, cacheResult.item);
          } else if (cacheResult.status === CacheStatus.NEGATIVE) {
            negativesToCache.push(value);
          }
        });
      }

      const promises = [];
      if (hitsToCache.size > 0) {
        promises.push(cacheAdapter.cacheManyAsync(key, hitsToCache));
      }
      if (negativesToCache.length > 0) {
        promises.push(cacheAdapter.cacheDBMissesAsync(key, negativesToCache));
      }
      await Promise.all(promises);
    }

    for (const value of unfulfilledValues) {
      retMap.set(value, { status: CacheStatus.MISS });
    }

    return retMap;
  }

  public async cacheManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheManyAsync(key, objectMap);
    }
  }

  public async cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheDBMissesAsync(key, values);
    }
  }

  public async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    // delete from lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.invalidateManyAsync(key, values);
    }
  }
}
