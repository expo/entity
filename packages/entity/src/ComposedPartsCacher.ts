import { CacheLoadResult } from '@expo/entity/src/internal/ReadThroughEntityCache';
import invariant from 'invariant';

import PartsCacher, { Parts, PartsKey } from './PartsCacher';
import { CacheStatus } from './internal/ReadThroughEntityCache';

/**
 * A composed cacher by which objects are stored, fetched and removed in a series of caches
 * */
export default class ComposedPartsCacher<TFields> extends PartsCacher<TFields> {
  constructor(
    /**
     * The series of cachers to use, in order of evaluation
     * For example, [cacheAdapterEvaluatedFirst, cacheAdapterEvaluatedSecond, cacheAdapterEvaluatedThird]
     */
    private readonly partsCachers: PartsCacher<TFields>[]
  ) {
    super();
  }

  public async loadManyAsync(
    partsList: readonly Parts[]
  ): Promise<ReadonlyMap<PartsKey, CacheLoadResult<TFields>>> {
    const resultsFromAllCachers = new Map<PartsKey, CacheLoadResult<TFields>>();
    const partsKeysToParts = new Map(
      partsList.map((parts) => [PartsCacher.getPartsKey(...parts), parts])
    );
    let partsKeysToLookup: PartsKey[] = partsList.map((parts) => PartsCacher.getPartsKey(...parts));
    for (const partsCacher of this.partsCachers) {
      const partsListToLookup = partsKeysToLookup.map((partsKey) => {
        const parts = partsKeysToParts.get(partsKey);
        invariant(parts, 'parts cannot be undefined');
        return parts;
      });
      const cacheResults = await partsCacher.loadManyAsync(partsListToLookup);
      const cacheMisses = [];
      for (const [partsKey, cacheResult] of cacheResults) {
        if (cacheResult.status === CacheStatus.MISS) {
          cacheMisses.push(partsKey);
        } else {
          resultsFromAllCachers.set(partsKey, cacheResult);
        }
      }
      partsKeysToLookup = cacheMisses;
    }

    // None of the cachers have these values, so they are misses
    for (const partsKey of partsKeysToLookup) {
      resultsFromAllCachers.set(partsKey, {
        status: CacheStatus.MISS,
      });
    }
    return resultsFromAllCachers;
  }

  public async cacheManyAsync(objectMap: ReadonlyMap<PartsKey, Readonly<TFields>>): Promise<void> {
    // perform action on lower layers first
    for (let i = this.partsCachers.length - 1; i >= 0; i--) {
      const partsCacher = this.partsCachers[i];
      invariant(partsCacher, 'parts cacher cannot be undefined');
      await partsCacher.cacheManyAsync(objectMap);
    }
  }

  public async cacheDBMissesAsync(partsList: readonly Parts[]): Promise<void> {
    // perform action on lower layers first
    for (let i = this.partsCachers.length - 1; i >= 0; i--) {
      const partsCacher = this.partsCachers[i];
      invariant(partsCacher, 'parts cacher cannot be undefined');
      await partsCacher.cacheDBMissesAsync(partsList);
    }
  }

  public async invalidateManyAsync(partsList: readonly Parts[]): Promise<void> {
    // perform action on lower layers first
    for (let i = this.partsCachers.length - 1; i >= 0; i--) {
      const cacheAdapter = this.partsCachers[i];
      invariant(cacheAdapter, 'parts cacher cannot be undefined');
      await cacheAdapter.invalidateManyAsync(partsList);
    }
  }
}
