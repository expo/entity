/* c8 ignore start - interface only */

import { EntityConfiguration } from './EntityConfiguration';
import { EntityDatabaseAdapter } from './EntityDatabaseAdapter';
import { EntityKnexDatabaseAdapter } from './EntityKnexDatabaseAdapter';

/**
 * A database adapter provider vends database adapters for a particular database adapter type.
 * Allows for passing global configuration to databse adapters, making testing easier.
 */
export interface IEntityDatabaseAdapterProvider {
  /**
   * Vend a database adapter.
   */
  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField>;

  /**
   * Vend a knex database adapter.
   */
  getKnexDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityKnexDatabaseAdapter<TFields, TIDField>;
}

/* c8 ignore stop - interface only */
