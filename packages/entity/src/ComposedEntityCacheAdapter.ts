import nullthrows from 'nullthrows';

import { EntityCompositeField } from './EntityConfiguration';
import IEntityCacheAdapter from './IEntityCacheAdapter';
import { CompositeFieldValueHolder, CompositeFieldHolder } from './internal/CompositeFieldHolder';
import {
  CompositeFieldValueHolderMap,
  CompositeFieldValueHolderReadonlyMap,
} from './internal/CompositeFieldValueHolderMap';
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

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const retMap = new Map<NonNullable<TFields[N]>, CacheLoadResult<TFields>>();
    const fulfilledFieldValuesByCacheIndex: NonNullable<TFields[N]>[][] = Array.from(
      { length: this.cacheAdapters.length },
      () => [],
    );

    let unfulfilledFieldValues = fieldValues;
    for (let i = 0; i < this.cacheAdapters.length; i++) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      const cacheResultsFromAdapter = await cacheAdapter.loadManyAsync(
        fieldName,
        unfulfilledFieldValues,
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
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>,
  ): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheManyAsync(fieldName, objectMap);
    }
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheDBMissesAsync(fieldName, fieldValues);
    }
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {
    // delete from lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.invalidateManyAsync(fieldName, fieldValues);
    }
  }

  public async loadManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<CompositeFieldValueHolderReadonlyMap<TFields, N, CacheLoadResult<TFields>>> {
    const retMap = new CompositeFieldValueHolderMap<TFields, N, CacheLoadResult<TFields>>();
    const fulfilledCompositeFieldValuesByCacheIndex: CompositeFieldValueHolder<TFields, N>[][] =
      Array.from({ length: this.cacheAdapters.length }, () => []);

    let unfulfilledCompositeFieldValues = compositeFieldValueHolders;
    for (let i = 0; i < this.cacheAdapters.length; i++) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      const cacheResultsFromAdapter = await cacheAdapter.loadManyCompositeFieldAsync(
        compositeFieldHolder,
        unfulfilledCompositeFieldValues,
      );

      const newUnfulfilledCompositeFieldValues = [];
      for (const [compositeFieldValue, cacheResult] of cacheResultsFromAdapter) {
        if (cacheResult.status === CacheStatus.MISS) {
          newUnfulfilledCompositeFieldValues.push(compositeFieldValue);
        } else {
          retMap.set(compositeFieldValue, cacheResult);
          nullthrows(fulfilledCompositeFieldValuesByCacheIndex[i]).push(compositeFieldValue);
        }
      }
      unfulfilledCompositeFieldValues = newUnfulfilledCompositeFieldValues;
      if (unfulfilledCompositeFieldValues.length === 0) {
        break;
      }
    }

    // Recache values from lower layers that were not found in higher layers
    // Write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      const hitsToCache = new CompositeFieldValueHolderMap<TFields, N, Readonly<TFields>>();
      const negativesToCache: CompositeFieldValueHolder<TFields, N>[] = [];

      // Loop over all lower layer caches to collect hits and misses
      for (let j = i + 1; j < this.cacheAdapters.length; j++) {
        const fulfilledCompositeFieldValues = nullthrows(
          fulfilledCompositeFieldValuesByCacheIndex[j],
        );
        fulfilledCompositeFieldValues.forEach((compositeFieldValue) => {
          const cacheResult = nullthrows(retMap.get(compositeFieldValue));
          if (cacheResult.status === CacheStatus.HIT) {
            hitsToCache.set(compositeFieldValue, cacheResult.item);
          } else if (cacheResult.status === CacheStatus.NEGATIVE) {
            negativesToCache.push(compositeFieldValue);
          }
        });
      }

      const promises = [];
      if (hitsToCache.size > 0) {
        promises.push(cacheAdapter.cacheManyCompositeFieldAsync(compositeFieldHolder, hitsToCache));
      }
      if (negativesToCache.length > 0) {
        promises.push(
          cacheAdapter.cacheCompositeFieldDBMissesAsync(compositeFieldHolder, negativesToCache),
        );
      }
      await Promise.all(promises);
    }

    for (const compositeFieldValue of unfulfilledCompositeFieldValues) {
      retMap.set(compositeFieldValue, { status: CacheStatus.MISS });
    }

    return retMap;
  }

  public async cacheManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    objectMap: CompositeFieldValueHolderReadonlyMap<TFields, N, Readonly<TFields>>,
  ): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheManyCompositeFieldAsync(compositeFieldHolder, objectMap);
    }
  }

  public async cacheCompositeFieldDBMissesAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {
    // write to lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.cacheCompositeFieldDBMissesAsync(
        compositeFieldHolder,
        compositeFieldValueHolders,
      );
    }
  }

  public async invalidateManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {
    // delete from lower layers first
    for (let i = this.cacheAdapters.length - 1; i >= 0; i--) {
      const cacheAdapter = nullthrows(this.cacheAdapters[i]);
      await cacheAdapter.invalidateManyCompositeFieldAsync(
        compositeFieldHolder,
        compositeFieldValueHolders,
      );
    }
  }
}
