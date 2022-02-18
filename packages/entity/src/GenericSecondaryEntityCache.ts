import invariant from 'invariant';

import { ISecondaryEntityCache } from './EntitySecondaryCacheLoader';
import PartsCacher, { Parts, PartsKey } from './PartsCacher';
import { CacheStatus } from './internal/ReadThroughEntityCache';
import { filterMap } from './utils/collections/maps';

/**
 * A custom secondary read-through entity cache is a way to add a custom second layer of caching for a particular
 * single entity load. One common way this may be used is to add a second layer of caching in a hot path that makes
 * a call to {@link EntityLoader.loadManyByFieldEqualityConjunctionAsync} is guaranteed to return at most one entity.
 */
export default abstract class GenericSecondaryEntityCache<TFields, TLoadParams>
  implements ISecondaryEntityCache<TFields, TLoadParams>
{
  constructor(
    protected readonly partsCacher: PartsCacher<TFields>,
    protected readonly getParts: (params: Readonly<TLoadParams>) => Parts
  ) {}

  public async loadManyThroughAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
    fetcher: (
      fetcherLoadParamsArray: readonly Readonly<TLoadParams>[]
    ) => Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>>
  ): Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>> {
    const partsList = loadParamsArray.map(this.getParts);
    const partsKeysToLoadParamsMap = new Map(
      loadParamsArray.map((loadParams) => {
        const parts = this.getParts(loadParams);
        return [PartsCacher.getPartsKey(...parts), loadParams];
      })
    );

    const cacheLoadResults = await this.partsCacher.loadManyAsync(partsList);

    invariant(
      cacheLoadResults.size === loadParamsArray.length,
      `${this.constructor.name} loadMany should return a result for each key`
    );

    const partsKeysToFetch = Array.from(
      filterMap(
        cacheLoadResults,
        (cacheLoadResult) => cacheLoadResult.status === CacheStatus.MISS
      ).keys()
    );

    // put cache hits in result map
    const results: Map<Readonly<TLoadParams>, Readonly<TFields> | null> = new Map();
    cacheLoadResults.forEach((cacheLoadResult, partsKey) => {
      if (cacheLoadResult.status === CacheStatus.HIT) {
        const loadParams = partsKeysToLoadParamsMap.get(partsKey);
        invariant(loadParams !== undefined, 'load params should be in cache key map');
        results.set(loadParams, cacheLoadResult.item);
      }
    });

    // fetch any misses from DB, add DB objects to results, cache DB results, inform cache of any missing DB results
    if (partsKeysToFetch.length > 0) {
      const loadParamsToFetch = partsKeysToFetch.map((partKey) => {
        const loadParams = partsKeysToLoadParamsMap.get(partKey);
        invariant(loadParams !== undefined, 'load params should be in cache key map');
        return loadParams;
      });
      const fetchResults = await fetcher(loadParamsToFetch);

      const fetchMisses = loadParamsToFetch.filter((loadParams) => {
        // all values of fetchResults should be field objects or undefined
        return !fetchResults.get(loadParams);
      });

      for (const fetchMiss of fetchMisses) {
        results.set(fetchMiss, null);
      }

      const objectsToCache: Map<PartsKey, Readonly<TFields>> = new Map();
      for (const [loadParams, object] of fetchResults.entries()) {
        if (object) {
          const parts = this.getParts(loadParams);
          objectsToCache.set(PartsCacher.getPartsKey(...parts), object);
          results.set(loadParams, object);
        }
      }

      await Promise.all([
        this.partsCacher.cacheManyAsync(objectsToCache),
        this.partsCacher.cacheDBMissesAsync(
          fetchMisses.map((loadParams) => this.getParts(loadParams))
        ),
      ]);
    }

    return results;
  }

  /**
   * Invalidate the cache for objects cached by constructCacheKey(loadParams).
   *
   * @param loadParamsArray - load params to invalidate
   */
  public invalidateManyAsync(loadParamsArray: readonly Readonly<TLoadParams>[]): Promise<void> {
    const partsList = loadParamsArray.map(this.getParts);
    return this.partsCacher.invalidateManyAsync(partsList);
  }
}
