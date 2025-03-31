import EntityConfiguration from './EntityConfiguration';
import IEntityCacheAdapter from './IEntityCacheAdapter';

/**
 * A cache adapter provider vends cache adapters for a particular cache adapter type.
 * Allows for passing global configuration to cache adapters.
 */
export default interface IEntityCacheAdapterProvider {
  /**
   * Vend a cache adapter for an entity configuration.
   */
  getCacheAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): IEntityCacheAdapter<TFields, TIDField>;
}
