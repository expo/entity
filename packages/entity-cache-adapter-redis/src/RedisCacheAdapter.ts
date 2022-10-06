import { EntityCacheAdapter, EntityConfiguration, CacheLoadResult, mapKeys } from '@expo/entity';
import invariant from 'invariant';

import GenericRedisCacher, { IRedis } from './GenericRedisCacher';

export interface RedisCacheAdapterContext {
  /**
   * Instance of ioredis.Redis
   */
  redisClient: IRedis;

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
  private readonly genericRedisCacher: GenericRedisCacher<TFields>;
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    private readonly context: RedisCacheAdapterContext
  ) {
    super(entityConfiguration);

    this.genericRedisCacher = new GenericRedisCacher(
      {
        redisClient: context.redisClient,
        ttlSecondsNegative: context.ttlSecondsNegative,
        ttlSecondsPositive: context.ttlSecondsPositive,
      },
      entityConfiguration
    );
  }

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const redisCacheKeyToFieldValueMapping = new Map(
      fieldValues.map((fieldValue) => [this.makeCacheKey(fieldName, fieldValue), fieldValue])
    );
    const cacheResults = await this.genericRedisCacher.loadManyAsync(
      Array.from(redisCacheKeyToFieldValueMapping.keys())
    );

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
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void> {
    await this.genericRedisCacher.cacheManyAsync(
      mapKeys(objectMap, (fieldValue) => this.makeCacheKey(fieldName, fieldValue))
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
    invariant(columnName, `database field mapping missing for ${String(fieldName)}`);
    return this.context.makeKeyFn(
      this.context.cacheKeyPrefix,
      this.entityConfiguration.tableName,
      `v2.${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue)
    );
  }
}
