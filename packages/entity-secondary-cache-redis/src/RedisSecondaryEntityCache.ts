import type { EntityConfiguration } from '@expo/entity';
import { GenericSecondaryEntityCache } from '@expo/entity';
import type { GenericRedisCacheContext } from '@expo/entity-cache-adapter-redis';
import { GenericRedisCacher } from '@expo/entity-cache-adapter-redis';

/**
 * A redis GenericSecondaryEntityCache.
 */
export class RedisSecondaryEntityCache<
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
