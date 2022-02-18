import { EntityConfiguration, PartsCacheAdapter, Parts } from '@expo/entity';
import SimplePartsCacher from '@expo/entity/build/SimplePartsCacher';
import invariant from 'invariant';
import { Redis } from 'ioredis';

import GenericRedisCacher from './GenericRedisCacher';

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

export default class RedisCacheAdapter<TFields> extends PartsCacheAdapter<TFields> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    private readonly context: RedisCacheAdapterContext
  ) {
    super(
      entityConfiguration,
      new SimplePartsCacher(
        new GenericRedisCacher(
          {
            redisClient: context.redisClient,
            ttlSecondsNegative: context.ttlSecondsNegative,
            ttlSecondsPositive: context.ttlSecondsPositive,
          },
          entityConfiguration
        ),
        context.makeKeyFn
      )
    );
  }

  getParts<N extends keyof TFields>(fieldName: N, fieldValue: NonNullable<TFields[N]>): Parts {
    const columnName = this.entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
    invariant(columnName, `database field mapping missing for ${fieldName}`);
    return [
      this.context.cacheKeyPrefix,
      this.entityConfiguration.tableName,
      `v2.${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue),
    ];
  }
}
