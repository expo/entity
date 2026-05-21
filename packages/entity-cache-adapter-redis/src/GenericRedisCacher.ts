import type {
  CacheLoadResult,
  EntityConfiguration,
  IEntityGenericCacher,
  IEntityLoadKey,
  IEntityLoadValue,
} from '@expo/entity';
import {
  CacheStatus,
  transformCacheObjectToFields,
  transformFieldsToCacheObject,
} from '@expo/entity';

import { redisTransformerMap } from './RedisCommon.ts';
import { wrapNativeRedisCallAsync } from './errors/wrapNativeRedisCallAsync.ts';
import { getSurroundingCacheKeyVersionsForInvalidation } from './utils/getSurroundingCacheKeyVersionsForInvalidation.ts';

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

/**
 * The strategy for generating the set of cache keys to invalidate in the Redis cache after entity mutation.
 */
export enum RedisCacheInvalidationStrategy {
  /**
   * Invalidate just the cache key(s) for the current cacheKeyVersion of the entity.
   */
  CURRENT_CACHE_KEY_VERSION = 'current-cache-key-version',

  /**
   * Invalidate the cache key(s) for the current cacheKeyVersion and the surrounding cache key versions
   * (e.g. `1`, `2` and `3` if the current version is `2`). This can be useful for deployment safety, where
   * some machines may be operating on an old version of the code and thus an old cacheKeyVersion, and some the new version.
   * This strategy generates cache keys for both old and potential future new versions.
   */
  SURROUNDING_CACHE_KEY_VERSIONS = 'surrounding-cache-key-versions',

  /**
   * Invalidate cache keys based on user-specified function from the current cacheKeyVersion to a list of cache key
   * versions to invalidate.
   */
  CUSTOM = 'custom',
}

export type GenericRedisCacheInvalidationConfig =
  | {
      /**
       * Invalidation strategy for the cache.
       */
      invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION;
    }
  | {
      /**
       * Invalidation strategy for the cache.
       */
      invalidationStrategy: RedisCacheInvalidationStrategy.SURROUNDING_CACHE_KEY_VERSIONS;
    }
  | {
      /**
       * Invalidation strategy for the cache.
       */
      invalidationStrategy: RedisCacheInvalidationStrategy.CUSTOM;

      /**
       * Function that takes the current cache key version and returns the cache key versions to invalidate.
       */
      cacheKeyVersionsToInvalidateFn: (cacheKeyVersion: number) => readonly number[];
    };

function validateGenericRedisCacheContext(context: GenericRedisCacheContext): void {
  if (context.cacheKeyDelimiter.length === 0) {
    throw new Error('GenericRedisCacheContext.cacheKeyDelimiter must be a non-empty string');
  }
  if (context.cacheKeyDelimiter.includes('\\')) {
    throw new Error(
      `GenericRedisCacheContext.cacheKeyDelimiter must not contain the escape character "\\" (got ${JSON.stringify(context.cacheKeyDelimiter)})`,
    );
  }
  if (!Number.isInteger(context.ttlSecondsPositive) || context.ttlSecondsPositive <= 0) {
    throw new Error(
      `GenericRedisCacheContext.ttlSecondsPositive must be a positive integer (got ${context.ttlSecondsPositive})`,
    );
  }
  if (!Number.isInteger(context.ttlSecondsNegative) || context.ttlSecondsNegative <= 0) {
    throw new Error(
      `GenericRedisCacheContext.ttlSecondsNegative must be a positive integer (got ${context.ttlSecondsNegative})`,
    );
  }
}

export interface GenericRedisCacheContext {
  /**
   * Instance of ioredis.Redis
   */
  redisClient: IRedis;

  /**
   * Delimiter used to join the parts of a Redis cache key (cache key prefix,
   * versions, entity name, field values, etc). Typically `:`.
   *
   * The cacher escapes occurrences of this delimiter (and the escape character `\`)
   * within each part before joining, so the encoding is injective regardless of
   * what the parts contain. This prevents a value that happens to contain the
   * delimiter from colliding with a different (key, value) pair.
   */
  cacheKeyDelimiter: string;

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

  /**
   * Configuration for cache invalidation strategy.
   */
  invalidationConfig: GenericRedisCacheInvalidationConfig;
}

export class GenericRedisCacher<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityGenericCacher<TFields, TIDField> {
  constructor(
    private readonly context: GenericRedisCacheContext,
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ) {
    validateGenericRedisCacheContext(context);
  }

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
    const keyAndValueParts = key.createCacheKeyPartsForLoadValue(this.entityConfiguration, value);
    const allParts = [
      this.context.cacheKeyPrefix,
      cacheKeyType,
      this.entityConfiguration.tableName,
      `v4.${cacheKeyVersion}`,
      ...keyAndValueParts,
    ];
    const delimiter = this.context.cacheKeyDelimiter;
    return allParts
      .map((part) => part.replaceAll('\\', '\\\\').replaceAll(delimiter, `\\${delimiter}`))
      .join(delimiter);
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
    switch (this.context.invalidationConfig.invalidationStrategy) {
      case RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION:
        return [
          this.makeCacheKeyForCacheKeyVersion(key, value, this.entityConfiguration.cacheKeyVersion),
        ];
      case RedisCacheInvalidationStrategy.SURROUNDING_CACHE_KEY_VERSIONS:
        return getSurroundingCacheKeyVersionsForInvalidation(
          this.entityConfiguration.cacheKeyVersion,
        ).map((cacheKeyVersion) =>
          this.makeCacheKeyForCacheKeyVersion(key, value, cacheKeyVersion),
        );
      case RedisCacheInvalidationStrategy.CUSTOM: {
        const cacheKeyVersions = this.context.invalidationConfig.cacheKeyVersionsToInvalidateFn(
          this.entityConfiguration.cacheKeyVersion,
        );
        if (cacheKeyVersions.length === 0) {
          throw new Error(
            `GenericRedisCacheContext.invalidationConfig.cacheKeyVersionsToInvalidateFn returned an empty list for cacheKeyVersion ${this.entityConfiguration.cacheKeyVersion}; this would silently disable invalidation`,
          );
        }
        return cacheKeyVersions.map((cacheKeyVersion) =>
          this.makeCacheKeyForCacheKeyVersion(key, value, cacheKeyVersion),
        );
      }
    }
  }
}
