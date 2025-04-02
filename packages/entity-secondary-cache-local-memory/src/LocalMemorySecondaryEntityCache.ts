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
  TIDField extends keyof TFields,
  TLoadParams,
> extends GenericSecondaryEntityCache<TFields, TIDField, TLoadParams> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    localMemoryCache: LocalMemoryCache<TFields>,
  ) {
    super(new GenericLocalMemoryCacher(entityConfiguration, localMemoryCache), (params) =>
      JSON.stringify(params),
    );
  }
}
