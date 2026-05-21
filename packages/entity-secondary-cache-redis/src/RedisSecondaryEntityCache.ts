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
    cacheKeyNamespace: string,
    constructRedisKeyParts: (params: Readonly<TLoadParams>) => readonly string[],
  ) {
    const constructRedisKey = (params: Readonly<TLoadParams>): string => {
      const cacheKeyParts = [
        genericRedisCacheContext.cacheKeyPrefix,
        'secondary',
        cacheKeyNamespace,
        ...constructRedisKeyParts(params),
      ];
      const delimiter = genericRedisCacheContext.cacheKeyDelimiter;
      const escape = (s: string): string =>
        s.replaceAll('\\', '\\\\').replaceAll(delimiter, `\\${delimiter}`);
      return cacheKeyParts.map(escape).join(delimiter);
    };
    super(new GenericRedisCacher(genericRedisCacheContext, entityConfiguration), constructRedisKey);
  }
}
