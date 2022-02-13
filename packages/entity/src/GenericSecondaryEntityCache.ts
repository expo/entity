import { CacheStatus, filterMap, ISecondaryEntityCache, zipToMap } from '@expo/entity';
import invariant from 'invariant';

import IEntityGenericCacher from './IEntityGenericCacher';

/**
 * A custom secondary read-through entity cache is a way to add a custom second layer of caching for a particular
 * single entity load. One common way this may be used is to add a second layer of caching in a hot path that makes
 * a call to {@link EntityLoader.loadManyByFieldEqualityConjunctionAsync} is guaranteed to return at most one entity.
 */
export default abstract class GenericSecondaryEntityCache<TFields, TLoadParams>
  implements ISecondaryEntityCache<TFields, TLoadParams>
{
  constructor(
    protected readonly cacher: IEntityGenericCacher<TFields>,
    protected readonly constructCacheKey: (params: Readonly<TLoadParams>) => string
  ) {}

  public async loadManyThroughAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
    fetcher: (
      fetcherLoadParamsArray: readonly Readonly<TLoadParams>[]
    ) => Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>>
  ): Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>> {
    const cacheKeys = loadParamsArray.map(this.constructCacheKey);
    const cacheKeyToLoadParamsMap = zipToMap(cacheKeys, loadParamsArray);

    const cacheLoadResults = await this.cacher.loadManyAsync(cacheKeys);

    invariant(
      cacheLoadResults.size === loadParamsArray.length,
      `${this.constructor.name} loadMany should return a result for each key`
    );

    const cacheKeysToFetch = Array.from(
      filterMap(
        cacheLoadResults,
        (cacheLoadResult) => cacheLoadResult.status === CacheStatus.MISS
      ).keys()
    );

    // put cache hits in result map
    const results: Map<Readonly<TLoadParams>, Readonly<TFields> | null> = new Map();
    cacheLoadResults.forEach((cacheLoadResult, cacheKey) => {
      if (cacheLoadResult.status === CacheStatus.HIT) {
        const loadParams = cacheKeyToLoadParamsMap.get(cacheKey);
        invariant(loadParams !== undefined, 'load params should be in cache key map');
        results.set(loadParams, cacheLoadResult.item);
      }
    });

    // fetch any misses from DB, add DB objects to results, cache DB results, inform cache of any missing DB results
    if (cacheKeysToFetch.length > 0) {
      const loadParamsToFetch = cacheKeysToFetch.map((cacheKey) => {
        const loadParams = cacheKeyToLoadParamsMap.get(cacheKey);
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

      const objectsToCache: Map<string, Readonly<TFields>> = new Map();
      for (const [loadParams, object] of fetchResults.entries()) {
        if (object) {
          objectsToCache.set(this.constructCacheKey(loadParams), object);
          results.set(loadParams, object);
        }
      }

      await Promise.all([
        this.cacher.cacheManyAsync(objectsToCache),
        this.cacher.cacheDBMissesAsync(fetchMisses.map(this.constructCacheKey)),
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
    const cacheKeys = loadParamsArray.map(this.constructCacheKey);
    return this.cacher.invalidateManyAsync(cacheKeys);
  }
}
