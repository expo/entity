import {
  EntityConfiguration,
  GenericSecondaryEntityCache,
  Parts,
  SimplePartsCacher,
} from '@expo/entity';
import { GenericRedisCacheContext, GenericRedisCacher } from '@expo/entity-cache-adapter-redis';

/**
 * A custom secondary read-through entity cache is a way to add a custom second layer of caching for a particular
 * single entity load. One common way this may be used is to add a second layer of caching in a hot path that makes
 * a call to {@link EntityLoader.loadManyByFieldEqualityConjunctionAsync} is guaranteed to return at most one entity.
 */
export default class RedisSecondaryEntityCache<
  TFields,
  TLoadParams
> extends GenericSecondaryEntityCache<TFields, TLoadParams> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    genericRedisCacheContext: GenericRedisCacheContext,
    makeRedisSpecificKey: (...parts: Parts) => string,
    getParts: (params: Readonly<TLoadParams>) => Parts
  ) {
    super(
      new SimplePartsCacher(
        new GenericRedisCacher(genericRedisCacheContext, entityConfiguration),
        makeRedisSpecificKey
      ),
      getParts
    );
  }
}
