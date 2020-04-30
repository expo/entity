import {
  EntityCacheAdapter,
  EntityConfiguration,
  FieldTransformerMap,
  CacheLoadResult,
  CacheStatus,
} from '@expo/entity';
import { Redis } from 'ioredis';

import { redisTransformerMap } from './RedisCommon';

// Sentinel value we store in Redis to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
const DOES_NOT_EXIST_REDIS = '';

export interface RedisCacheAdapterContext {
  redisClient: Redis;
  makeKeyFn: (...parts: string[]) => string;
  cacheKeyVersion: number;
  cacheKeyPrefix: string;
  ttlSecondsPositive: number;
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
    const redisResults = await this.context.redisClient.mget(...redisKeys);

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
    await redisTransaction.exec();
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
    await redisTransaction.exec();
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    if (fieldValues.length === 0) {
      return;
    }

    const redisKeys = fieldValues.map((fieldValue) => this.makeCacheKey(fieldName, fieldValue));
    await this.context.redisClient.del(...redisKeys);
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
