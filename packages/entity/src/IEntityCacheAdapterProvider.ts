import { EntityCacheAdapter, EntityConfiguration } from '.';

/**
 * A cache adapter provider vends cache adapters for a particular cache adapter type.
 * Allows for passing global configuration to cache adapters.
 */
export default interface IEntityCacheAdapterProvider {
  /**
   * Vend a cache adapter.
   */
  getCacheAdapter<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityCacheAdapter<TFields>;
}
