import {
  EntityCacheAdapter,
  EntityConfiguration,
  CacheLoadResult,
  FieldTransformerMap,
  mapKeys,
  transformCacheObjectToFields,
  CacheStatus,
  transformFieldsToCacheObject,
} from '@expo/entity';
import invariant from 'invariant';
import { Redis } from 'ioredis';

import GenericRedisCacher from './GenericRedisCacher';
import { redisTransformerMap } from './RedisCommon';

export interface RedisCacheAdapterContext {
  /**
   * Instance of ioredis.Redis
   */
  redisClient: Redis;

  /**
   * Create a key string for key parts (cache key prefix, versions, entity name, etc).
   * Most commonly a simple `parts.join(':')`. See integration test for example.
   */
  makeKeyFn: (...parts: string[]) => string;

  /**
   * Global cache version for the entity framework. Bumping this version will
   * invalidate the cache for all entities at once.
   */
  cacheKeyVersion: number;

  /**
   * Prefix prepended to all entity cache keys. Useful for adding a short, human-readable
   * distintion for entity keys, e.g. `ent-`
   */
  cacheKeyPrefix: string;

  /**
   * TTL for caching database hits. Successive entity loads within this TTL
   * will be read from cache (unless invalidated).
   */
  ttlSecondsPositive: number;

  /**
   * TTL for negatively caching database misses. Successive entity loads within
   * this TTL will be assumed not present in the database (unless invalidated).
   */
  ttlSecondsNegative: number;
}

export default class RedisCacheAdapter<TFields> extends EntityCacheAdapter<TFields> {
  /**
   * Transformer definitions for field types. Used to modify values as they are read from or written to
   * the cache. Override in concrete subclasses to change transformation behavior.
   * If a field type is not present in the map, then fields of that type will not be transformed.
   */
  private readonly redisFieldTransformer: FieldTransformerMap = redisTransformerMap;
  private readonly genericRedisCacher: GenericRedisCacher;
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    private readonly context: RedisCacheAdapterContext
  ) {
    super(entityConfiguration);

    this.genericRedisCacher = new GenericRedisCacher({
      redisClient: context.redisClient,
      ttlSecondsNegative: context.ttlSecondsNegative,
      ttlSecondsPositive: context.ttlSecondsPositive,
    });
  }

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult>> {
    const redisCacheKeyToFieldValueMapping = new Map(
      fieldValues.map((fieldValue) => [this.makeCacheKey(fieldName, fieldValue), fieldValue])
    );
    const rawCacheResults = await this.genericRedisCacher.loadManyAsync(
      Array.from(redisCacheKeyToFieldValueMapping.keys())
    );
    const cacheResults = new Map<string, CacheLoadResult>();
    for (const [redisCacheKey, rawCacheResult] of rawCacheResults) {
      if (rawCacheResult.status === CacheStatus.HIT) {
        cacheResults.set(redisCacheKey, {
          status: CacheStatus.HIT,
          item: transformCacheObjectToFields(
            this.entityConfiguration,
            this.redisFieldTransformer,
            rawCacheResult.item
          ),
        });
      } else {
        cacheResults.set(redisCacheKey, rawCacheResult);
      }
    }

    return mapKeys(cacheResults, (redisCacheKey) => {
      const fieldValue = redisCacheKeyToFieldValueMapping.get(redisCacheKey);
      invariant(
        fieldValue !== undefined,
        'Unspecified cache key %s returned from generic Redis cacher',
        redisCacheKey
      );
      return fieldValue;
    });
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, object>
  ): Promise<void> {
    const cacheObjectMap = new Map<NonNullable<TFields[N]>, object>();
    for (const [fieldValue, object] of objectMap) {
      cacheObjectMap.set(
        fieldValue,
        transformFieldsToCacheObject(
          this.entityConfiguration,
          this.redisFieldTransformer,
          object as Readonly<TFields>
        )
      );
    }
    await this.genericRedisCacher.cacheManyAsync(
      mapKeys(cacheObjectMap, (fieldValue) => this.makeCacheKey(fieldName, fieldValue))
    );
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    await this.genericRedisCacher.cacheDBMissesAsync(
      fieldValues.map((fieldValue) => this.makeCacheKey(fieldName, fieldValue))
    );
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    await this.genericRedisCacher.invalidateManyAsync(
      fieldValues.map((fieldValue) => this.makeCacheKey(fieldName, fieldValue))
    );
  }

  private makeCacheKey<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): string {
    const columnName = this.entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
    invariant(columnName, `database field mapping missing for ${fieldName}`);
    return this.context.makeKeyFn(
      this.context.cacheKeyPrefix,
      this.entityConfiguration.tableName,
      `v2.${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue)
    );
  }
}
