/* c8 ignore start - interface only */

import { EntityCompanion } from './EntityCompanion';
import { EntityConfiguration } from './EntityConfiguration';
import { EntityDatabaseAdapter } from './EntityDatabaseAdapter';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerScopedEntityCompanion } from './ViewerScopedEntityCompanion';
import { EntityTableDataCoordinator } from './internal/EntityTableDataCoordinator';

/**
 * A database adapter provider vends database adapters for a particular database adapter type.
 * Allows for passing global configuration to databse adapters, making testing easier.
 */
export interface IEntityDatabaseAdapterProvider {
  /**
   * A unique key for this type of adapter provider, used to avoid installing extensions multiple times.
   */
  getExtensionsKey(): string;

  /**
   * Install any necessary extensions to the Entity system.
   */
  installExtensions({
    EntityCompanionClass,
    EntityTableDataCoordinatorClass,
    ViewerScopedEntityCompanionClass,
    ReadonlyEntityClass,
  }: {
    EntityCompanionClass: typeof EntityCompanion;
    EntityTableDataCoordinatorClass: typeof EntityTableDataCoordinator;
    ViewerScopedEntityCompanionClass: typeof ViewerScopedEntityCompanion;
    ReadonlyEntityClass: typeof ReadonlyEntity;
  }): void;

  /**
   * Vend a database adapter.
   */
  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField>;
}

/* c8 ignore stop - interface only */
