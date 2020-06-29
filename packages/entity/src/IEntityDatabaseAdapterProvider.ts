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
  getDatabaseAdapter<TDatabaseFields>(
    entityConfiguration: EntityConfiguration<TDatabaseFields>
  ): EntityDatabaseAdapter<TDatabaseFields>;
}
