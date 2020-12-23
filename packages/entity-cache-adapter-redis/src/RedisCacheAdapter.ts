import {
  EntityCacheAdapter,
  EntityConfiguration,
  FieldTransformerMap,
  CacheLoadResult,
  CacheStatus,
} from '@expo/entity';
import { Redis } from 'ioredis';

import { redisTransformerMap } from './RedisCommon';
import wrapNativeRedisCall from './errors/wrapNativeRedisCall';

// Sentinel value we store in Redis to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
const DOES_NOT_EXIST_REDIS = '';

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
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    private readonly context: RedisCacheAdapterContext
  ) {
    super(entityConfiguration);
  }

  public getFieldTransformerMap(): FieldTransformerMap {
    return redisTransformerMap;
  }

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult>> {
    if (fieldValues.length === 0) {
      return new Map();
    }

    const redisKeys = fieldValues.map((fieldValue) => this.makeCacheKey(fieldName, fieldValue));
    const redisResults = await wrapNativeRedisCall(this.context.redisClient.mget(...redisKeys));

    const results = new Map<NonNullable<TFields[N]>, CacheLoadResult>();
    for (let i = 0; i < fieldValues.length; i++) {
      const fieldValue = fieldValues[i];
      const redisResult = redisResults[i];

      if (redisResult === DOES_NOT_EXIST_REDIS) {
        results.set(fieldValue, {
          status: CacheStatus.NEGATIVE,
        });
      } else if (redisResult) {
        results.set(fieldValue, {
          status: CacheStatus.HIT,
          item: JSON.parse(redisResult),
        });
      } else {
        results.set(fieldValue, {
          status: CacheStatus.MISS,
        });
      }
    }
    return results;
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, object>
  ): Promise<void> {
    if (objectMap.size === 0) {
      return;
    }

    let redisTransaction = this.context.redisClient.multi();
    objectMap.forEach((object, fieldValue) => {
      const redisKey = this.makeCacheKey(fieldName, fieldValue);
      redisTransaction = redisTransaction.set(
        redisKey,
        JSON.stringify(object),
        'EX',
        this.context.ttlSecondsPositive
      );
    });
    await wrapNativeRedisCall(redisTransaction.exec());
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    if (fieldValues.length === 0) {
      return;
    }

    let redisTransaction = this.context.redisClient.multi();
    fieldValues.forEach((fieldValue) => {
      const redisKey = this.makeCacheKey(fieldName, fieldValue);
      redisTransaction = redisTransaction.set(
        redisKey,
        DOES_NOT_EXIST_REDIS,
        'EX',
        this.context.ttlSecondsNegative
      );
    });
    await wrapNativeRedisCall(redisTransaction.exec());
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    if (fieldValues.length === 0) {
      return;
    }

    const redisKeys = fieldValues.map((fieldValue) => this.makeCacheKey(fieldName, fieldValue));
    await wrapNativeRedisCall(this.context.redisClient.del(...redisKeys));
  }

  private makeCacheKey<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): string {
    return this.context.makeKeyFn(
      this.context.cacheKeyPrefix,
      this.entityConfiguration.tableName,
      `v${this.entityConfiguration.cacheKeyVersion}`,
      fieldName as string,
      String(fieldValue)
    );
  }
}
