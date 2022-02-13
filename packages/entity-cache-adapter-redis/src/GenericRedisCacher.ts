import {
  CacheLoadResult,
  CacheStatus,
  EntityConfiguration,
  transformCacheObjectToFields,
  transformFieldsToCacheObject,
  IEntityGenericCacher,
} from '@expo/entity';
import { Redis } from 'ioredis';

import { redisTransformerMap } from './RedisCommon';
import wrapNativeRedisCallAsync from './errors/wrapNativeRedisCallAsync';

// Sentinel value we store in Redis to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
const DOES_NOT_EXIST_REDIS = '';

export interface GenericRedisCacheContext {
  /**
   * Instance of ioredis.Redis
   */
  redisClient: Redis;

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
    private readonly context: GenericRedisCacheContext,
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

  public async cacheDBMissesAsync(keys: string[]): Promise<void> {
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

  public async invalidateManyAsync(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await wrapNativeRedisCallAsync(() => this.context.redisClient.del(...keys));
  }
}
