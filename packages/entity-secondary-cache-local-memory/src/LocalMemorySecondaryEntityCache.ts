import { EntityConfiguration, GenericSecondaryEntityCache } from '@expo/entity';
import {
  GenericLocalMemoryCacher,
  LocalMemoryCache,
} from '@expo/entity-cache-adapter-local-memory';

/**
 * A local memory GenericSecondaryEntityCache.
 *
 * @remarks
 *
 * TLoadParams must be JSON stringifyable.
 */
export default class LocalMemorySecondaryEntityCache<
  TFields extends Record<string, any>,
  TLoadParams,
> extends GenericSecondaryEntityCache<TFields, TLoadParams> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    localMemoryCache: LocalMemoryCache<TFields>,
  ) {
    super(new GenericLocalMemoryCacher(entityConfiguration, localMemoryCache), (params) =>
      JSON.stringify(params),
    );
  }
}
