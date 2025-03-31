import {
  CacheLoadResult,
  CacheStatus,
  EntityConfiguration,
  transformCacheObjectToFields,
  transformFieldsToCacheObject,
  IEntityGenericCacher,
  IEntityLoadKey,
  IEntityLoadValue,
} from '@expo/entity';

import { redisTransformerMap } from './RedisCommon';
import wrapNativeRedisCallAsync from './errors/wrapNativeRedisCallAsync';
import { getCacheKeyVersionsToInvalidate } from './utils/getCacheKeyVersionsToInvalidate';

// Sentinel value we store in Redis to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
const DOES_NOT_EXIST_REDIS = '';

export interface IRedisTransaction {
  set(key: string, value: string, secondsToken: 'EX', seconds: number): this;
  exec(): Promise<any>;
}

export interface IRedis {
  mget(...args: [...keys: string[]]): Promise<(string | null)[]>;
  multi(): IRedisTransaction;
  del(...args: [...keys: string[]]): Promise<any>;
}

export interface GenericRedisCacheContext {
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

export default class GenericRedisCacher<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityGenericCacher<TFields, TIDField>
{
  constructor(
    private readonly context: GenericRedisCacheContext,
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ) {}

  public async loadManyAsync(
    keys: readonly string[],
  ): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>> {
    if (keys.length === 0) {
      return new Map();
    }

    const redisResults = await wrapNativeRedisCallAsync(() =>
      this.context.redisClient.mget(...keys),
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
            JSON.parse(redisResult),
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
          transformFieldsToCacheObject(this.entityConfiguration, redisTransformerMap, object),
        ),
        'EX',
        this.context.ttlSecondsPositive,
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
        this.context.ttlSecondsNegative,
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

  private makeCacheKeyForCacheKeyVersion<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue, cacheKeyVersion: number): string {
    const cacheKeyType = key.getLoadMethodType();
    const parts = key.createCacheKeyPartsForLoadValue(this.entityConfiguration, value);
    return this.context.makeKeyFn(
      this.context.cacheKeyPrefix,
      cacheKeyType,
      this.entityConfiguration.tableName,
      `v2.${cacheKeyVersion}`,
      ...parts,
    );
  }

  public makeCacheKeyForStorage<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue): string {
    return this.makeCacheKeyForCacheKeyVersion(
      key,
      value,
      this.entityConfiguration.cacheKeyVersion,
    );
  }

  public makeCacheKeysForInvalidation<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue): readonly string[] {
    return getCacheKeyVersionsToInvalidate(this.entityConfiguration.cacheKeyVersion).map(
      (cacheKeyVersion) => this.makeCacheKeyForCacheKeyVersion(key, value, cacheKeyVersion),
    );
  }
}
