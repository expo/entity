import { EntityConfiguration, GenericSecondaryEntityCache } from '@expo/entity';
import { RedisCacheAdapterContext, GenericRedisCacher } from '@expo/entity-cache-adapter-redis';

/**
 * A redis GenericSecondaryEntityCache.
 */
export default class RedisSecondaryEntityCache<
  TFields,
  TLoadParams
> extends GenericSecondaryEntityCache<TFields, TLoadParams> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    genericRedisCacheContext: RedisCacheAdapterContext,
    constructRedisKey: (params: Readonly<TLoadParams>) => string
  ) {
    super(new GenericRedisCacher(genericRedisCacheContext, entityConfiguration), constructRedisKey);
  }
}
