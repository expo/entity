import EntityConfiguration from './EntityConfiguration';
import EntityDatabaseAdapter from './EntityDatabaseAdapter';

/**
 * A database adapter provider vends database adapters for a particular database adapter type.
 * Allows for passing global configuration to databse adapters, making testing easier.
 */
export default interface IEntityDatabaseAdapterProvider {
  /**
   * Vend a database adapter.
   */
  getDatabaseAdapter<TFields extends Record<string, any>>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityDatabaseAdapter<TFields>;
}
