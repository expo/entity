import {
  CacheLoadResult,
  CacheStatus,
  EntityConfiguration,
  transformCacheObjectToFields,
  transformFieldsToCacheObject,
  IEntityGenericCacher,
  mapMapAsync,
  filterMap,
  computeIfAbsent,
} from '@expo/entity';
import invariant from 'invariant';
import { Redis } from 'ioredis';

import { redisTransformerMap } from './RedisCommon';
import wrapNativeRedisCallAsync from './errors/wrapNativeRedisCallAsync';

// Sentinel value we store in Redis to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
const DOES_NOT_EXIST_REDIS = '';

export type ShardGroup = number;

export interface ShardedRedisCacheAdapterContext {
  /**
   * Shard computation function.
   */
  getShardGroupForKeysFn: (keys: readonly string[]) => ReadonlyMap<string, ShardGroup>;

  /**
   * Get Redis instance for shard group.
   */
  getRedisInstanceForShardGroup: (shardGroup: ShardGroup) => Redis;

  /**
   * Sharding scheme version. Increment when sharding scheme is updated.
   */
  shardingSchemeVersion: number;

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

export default class ShardedGenericRedisCacher<TFields> implements IEntityGenericCacher<TFields> {
  constructor(
    private readonly context: ShardedRedisCacheAdapterContext,
    private readonly entityConfiguration: EntityConfiguration<TFields>
  ) {}

  private getRedisClientsForKeys(
    keys: readonly string[]
  ): Map<ShardGroup, { keys: string[]; redisClient: Redis }> {
    const shardGroupsForKeys = this.context.getShardGroupForKeysFn(keys);
    const redisClientsForKeys = new Map<ShardGroup, { keys: string[]; redisClient: Redis }>();
    for (const [key, shardGroup] of shardGroupsForKeys) {
      const entry = computeIfAbsent(redisClientsForKeys, shardGroup, (currShardGroup) => ({
        keys: [],
        redisClient: this.context.getRedisInstanceForShardGroup(currShardGroup),
      }));
      entry.keys.push(key);
    }
    return redisClientsForKeys;
  }

  public async loadManyAsync(
    keys: readonly string[]
  ): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>> {
    if (keys.length === 0) {
      return new Map();
    }

    const redisClientsForKeys = this.getRedisClientsForKeys(keys);

    const allShardResults = (
      await mapMapAsync(redisClientsForKeys, async ({ redisClient, keys }) => {
        return await this.getCacheResultsForKeysAsync(redisClient, keys);
      })
    ).values();

    const results = new Map<string, CacheLoadResult<TFields>>();
    for (const shardResults of allShardResults) {
      for (const [shardResultKey, shardResult] of shardResults) {
        results.set(shardResultKey, shardResult);
      }
    }
    return results;
  }

  private async getCacheResultsForKeysAsync(
    redisClient: Redis,
    keys: readonly string[]
  ): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>> {
    const redisResults = await wrapNativeRedisCallAsync(() => redisClient.mget(...keys));

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

    const keys = [...objectMap.keys()];
    const redisClientsForKeys = this.getRedisClientsForKeys(keys);

    await mapMapAsync(redisClientsForKeys, async ({ redisClient, keys }) => {
      const keySet = new Set(keys);
      const objectMapForKeys = filterMap(objectMap, (_, k) => keySet.has(k));
      let redisTransaction = redisClient.multi();
      objectMapForKeys.forEach((object, key) => {
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
    });
  }

  public async cacheDBMissesAsync(allKeys: readonly string[]): Promise<void> {
    if (allKeys.length === 0) {
      return;
    }

    const redisClientsForKeys = this.getRedisClientsForKeys(allKeys);

    await mapMapAsync(redisClientsForKeys, async ({ redisClient, keys }) => {
      let redisTransaction = redisClient.multi();
      keys.forEach((key) => {
        redisTransaction = redisTransaction.set(
          key,
          DOES_NOT_EXIST_REDIS,
          'EX',
          this.context.ttlSecondsNegative
        );
      });
      await wrapNativeRedisCallAsync(() => redisTransaction.exec());
    });
  }

  public async invalidateManyAsync(allKeys: readonly string[]): Promise<void> {
    if (allKeys.length === 0) {
      return;
    }

    const redisClientsForKeys = this.getRedisClientsForKeys(allKeys);
    await mapMapAsync(redisClientsForKeys, async ({ redisClient, keys }) => {
      await wrapNativeRedisCallAsync(() => redisClient.del(...keys));
    });
  }

  public makeCacheKey<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): string {
    const columnName = this.entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
    invariant(columnName, `database field mapping missing for ${String(fieldName)}`);
    return this.context.makeKeyFn(
      this.context.cacheKeyPrefix,
      `v${this.context.shardingSchemeVersion}`,
      this.entityConfiguration.tableName,
      `v2.${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue)
    );
  }
}
