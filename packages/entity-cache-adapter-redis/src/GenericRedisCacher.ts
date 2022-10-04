import {
  CacheLoadResult,
  CacheStatus,
  EntityConfiguration,
  transformCacheObjectToFields,
  transformFieldsToCacheObject,
  IEntityGenericCacher,
} from '@expo/entity';
import invariant from 'invariant';
import Redis from 'ioredis';

import { redisTransformerMap } from './RedisCommon';
import wrapNativeRedisCallAsync from './errors/wrapNativeRedisCallAsync';

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

export default class GenericRedisCacher<TFields> implements IEntityGenericCacher<TFields> {
  constructor(
    private readonly context: RedisCacheAdapterContext,
    private readonly entityConfiguration: EntityConfiguration<TFields>
  ) {}
  public async loadManyAsync(
    keys: readonly string[]
  ): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>> {
    if (keys.length === 0) {
      return new Map();
    }

    const redisResults = await wrapNativeRedisCallAsync(() =>
      this.context.redisClient.mget(...keys)
    );

    const results = new Map<string, CacheLoadResult<TFields>>();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      const redisResult = redisResults[i];

      if (redisResult === DOES_NOT_EXIST_REDIS) {
        results.set(key, {
          status: CacheStatus.NEGATIVE,
        });
      } else if (redisResult) {
        results.set(key, {
          status: CacheStatus.HIT,
          item: transformCacheObjectToFields(
            this.entityConfiguration,
            redisTransformerMap,
            JSON.parse(redisResult)
          ),
        });
      } else {
        results.set(key, {
          status: CacheStatus.MISS,
        });
      }
    }
    return results;
  }

  public async cacheManyAsync(objectMap: ReadonlyMap<string, Readonly<TFields>>): Promise<void> {
    if (objectMap.size === 0) {
      return;
    }

    let redisTransaction = this.context.redisClient.multi();
    objectMap.forEach((object, key) => {
      redisTransaction = redisTransaction.set(
        key,
        JSON.stringify(
          transformFieldsToCacheObject(this.entityConfiguration, redisTransformerMap, object)
        ),
        'EX',
        this.context.ttlSecondsPositive
      );
    });
    await wrapNativeRedisCallAsync(() => redisTransaction.exec());
  }

  public async cacheDBMissesAsync(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    let redisTransaction = this.context.redisClient.multi();
    keys.forEach((key) => {
      redisTransaction = redisTransaction.set(
        key,
        DOES_NOT_EXIST_REDIS,
        'EX',
        this.context.ttlSecondsNegative
      );
    });
    await wrapNativeRedisCallAsync(() => redisTransaction.exec());
  }

  public async invalidateManyAsync(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await wrapNativeRedisCallAsync(() => this.context.redisClient.del(...keys));
  }

  public makeCacheKey<N extends keyof TFields>(
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
