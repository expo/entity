import {
  CacheStatus,
  EntityConfiguration,
  filterMap,
  ISecondaryEntityCache,
  transformCacheObjectToFields,
  transformFieldsToCacheObject,
  zipToMap,
} from '@expo/entity';
import {
  GenericRedisCacheContext,
  GenericRedisCacher,
  redisTransformerMap,
} from '@expo/entity-cache-adapter-redis';
import invariant from 'invariant';

/**
 * A custom secondary read-through entity cache is a way to add a custom second layer of caching for a particular
 * single entity load. One common way this may be used is to add a second layer of caching in a hot path that makes
 * a call to {@link EntityLoader.loadManyByFieldEqualityConjunctionAsync} is guaranteed to return at most one entity.
 */
export default class RedisSecondaryEntityCache<TFields, TLoadParams>
  implements ISecondaryEntityCache<TFields, TLoadParams> {
  private readonly genericRedisCacher: GenericRedisCacher;

  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    genericRedisCacheContext: GenericRedisCacheContext,
    private readonly constructRedisKey: (params: Readonly<TLoadParams>) => string
  ) {
    this.genericRedisCacher = new GenericRedisCacher(genericRedisCacheContext);
  }

  /**
   * Read-through cache function. Steps:
   *
   * 1. Check for cached objects
   * 2. Query the fetcher for loadParams not in the cache
   * 3. Cache the results from the fetcher
   * 4. Negatively cache anything missing from the fetcher
   * 5. Return the full set of data for the query.
   *
   * @param loadParamsArray - array of loadParams to load from the cache
   * @param fetcher - closure used to provide underlying data source objects for loadParams
   * @returns map from loadParams to the entity field object
   */
  public async loadManyThroughAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
    fetcher: (
      fetcherLoadParamsArray: readonly Readonly<TLoadParams>[]
    ) => Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>>
  ): Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>> {
    const redisKeys = loadParamsArray.map(this.constructRedisKey);
    const redisKeyToLoadParamsMap = zipToMap(redisKeys, loadParamsArray);

    const cacheLoadResults = await this.genericRedisCacher.loadManyAsync(redisKeys);

    invariant(
      cacheLoadResults.size === loadParamsArray.length,
      `${this.constructor.name} loadMany should return a result for each key`
    );

    const redisKeysToFetch = Array.from(
      filterMap(
        cacheLoadResults,
        (cacheLoadResult) => cacheLoadResult.status === CacheStatus.MISS
      ).keys()
    );

    // put transformed cache hits in result map
    const results: Map<Readonly<TLoadParams>, Readonly<TFields> | null> = new Map();
    cacheLoadResults.forEach((cacheLoadResult, redisKey) => {
      if (cacheLoadResult.status === CacheStatus.HIT) {
        const loadParams = redisKeyToLoadParamsMap.get(redisKey);
        invariant(loadParams !== undefined, 'load params should be in redis key map');
        results.set(
          loadParams,
          transformCacheObjectToFields(
            this.entityConfiguration,
            redisTransformerMap,
            cacheLoadResult.item
          )
        );
      }
    });

    // fetch any misses from DB, add DB objects to results, cache DB results, inform cache of any missing DB results
    if (redisKeysToFetch.length > 0) {
      const loadParamsToFetch = redisKeysToFetch.map((redisKey) => {
        const loadParams = redisKeyToLoadParamsMap.get(redisKey);
        invariant(loadParams !== undefined, 'load params should be in redis key map');
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

      const objectsToCache: Map<string, object> = new Map();
      for (const [loadParams, object] of fetchResults.entries()) {
        if (object) {
          objectsToCache.set(
            this.constructRedisKey(loadParams),
            transformFieldsToCacheObject(this.entityConfiguration, redisTransformerMap, object)
          );
          results.set(loadParams, object);
        }
      }

      await Promise.all([
        this.genericRedisCacher.cacheManyAsync(objectsToCache),
        this.genericRedisCacher.cacheDBMissesAsync(fetchMisses.map(this.constructRedisKey)),
      ]);
    }

    return results;
  }

  /**
   * Invalidate the cache for objects cached by constructRedisKey(loadParams).
   *
   * @param loadParamsArray - load params to invalidate
   */
  public async invalidateManyAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[]
  ): Promise<void> {
    await this.genericRedisCacher.invalidateManyAsync(loadParamsArray.map(this.constructRedisKey));
  }
}
