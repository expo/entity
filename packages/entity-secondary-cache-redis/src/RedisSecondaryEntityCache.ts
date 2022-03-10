import { EntityConfiguration, GenericSecondaryEntityCache } from '@expo/entity';
import { GenericRedisCacheContext, GenericRedisCacher } from '@expo/entity-cache-adapter-redis';

/**
 * A redis {@link GenericSecondaryEntityCache}.
 */
export default class RedisSecondaryEntityCache<
  TFields,
  TLoadParams
> extends GenericSecondaryEntityCache<TFields, TLoadParams> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    genericRedisCacheContext: GenericRedisCacheContext,
    constructRedisKey: (params: Readonly<TLoadParams>) => string
  ) {
    super(new GenericRedisCacher(genericRedisCacheContext, entityConfiguration), constructRedisKey);
  }
}
