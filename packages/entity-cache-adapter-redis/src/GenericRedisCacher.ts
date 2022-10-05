import { CacheLoadResult, EntityConfiguration, IEntityGenericCacher } from '@expo/entity';
import invariant from 'invariant';
import Redis from 'ioredis';

import ShardedGenericRedisCacher, {
  ShardedRedisCacheAdapterContext,
} from './ShardedGenericRedisCacher';

export type RedisCacheAdapterContext = Pick<
  ShardedRedisCacheAdapterContext,
  'cacheKeyPrefix' | 'cacheKeyVersion' | 'makeKeyFn' | 'ttlSecondsNegative' | 'ttlSecondsPositive'
> & {
  /**
   * Instance of ioredis.Redis
   */
  redisClient: Redis;
};

export default class GenericRedisCacher<TFields> implements IEntityGenericCacher<TFields> {
  private readonly shardedGenericRedisCacher: ShardedGenericRedisCacher<TFields>;
  constructor(
    context: RedisCacheAdapterContext,
    entityConfiguration: EntityConfiguration<TFields>
  ) {
    this.shardedGenericRedisCacher = new ShardedGenericRedisCacher(
      {
        ...context,
        getShardGroupForKeysFn: (keys) => new Map(keys.map((k) => [k, 1])),
        getRedisInstanceForShardGroup: (shardGroup) => {
          invariant(shardGroup === 1, 'invalid shard group');
          return context.redisClient;
        },
        shardingSchemeVersion: 1,
      },
      entityConfiguration
    );
  }
  public async loadManyAsync(
    keys: readonly string[]
  ): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>> {
    return this.shardedGenericRedisCacher.loadManyAsync(keys);
  }

  public async cacheManyAsync(objectMap: ReadonlyMap<string, Readonly<TFields>>): Promise<void> {
    return this.shardedGenericRedisCacher.cacheManyAsync(objectMap);
  }

  public async cacheDBMissesAsync(keys: readonly string[]): Promise<void> {
    return this.shardedGenericRedisCacher.cacheDBMissesAsync(keys);
  }

  public async invalidateManyAsync(keys: readonly string[]): Promise<void> {
    return this.shardedGenericRedisCacher.invalidateManyAsync(keys);
  }

  public makeCacheKey<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): string {
    return this.shardedGenericRedisCacher.makeCacheKey(fieldName, fieldValue);
  }
}
