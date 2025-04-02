import { EntityConfiguration, GenericSecondaryEntityCache } from '@expo/entity';
import { GenericRedisCacheContext, GenericRedisCacher } from '@expo/entity-cache-adapter-redis';

/**
 * A redis GenericSecondaryEntityCache.
 */
export default class RedisSecondaryEntityCache<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
  TLoadParams,
> extends GenericSecondaryEntityCache<TFields, TIDField, TLoadParams> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    genericRedisCacheContext: GenericRedisCacheContext,
    constructRedisKey: (params: Readonly<TLoadParams>) => string,
  ) {
    super(new GenericRedisCacher(genericRedisCacheContext, entityConfiguration), constructRedisKey);
  }
}
