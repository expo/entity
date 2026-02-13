import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';

import { PostgresEntityDatabaseAdapter } from './PostgresEntityDatabaseAdapter';
import { installEntityCompanionExtensions } from './extensions/EntityCompanionExtensions';
import { installEntityTableDataCoordinatorExtensions } from './extensions/EntityTableDataCoordinatorExtensions';
import { installReadonlyEntityExtensions } from './extensions/ReadonlyEntityExtensions';
import { installViewerScopedEntityCompanionExtensions } from './extensions/ViewerScopedEntityCompanionExtensions';

export interface PostgresEntityDatabaseAdapterConfiguration {
  /**
   * Maximum page size for pagination (first/last parameters).
   * If not specified, no limit is enforced.
   */
  paginationMaxPageSize?: number;
}

export class PostgresEntityDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  constructor(private readonly configuration: PostgresEntityDatabaseAdapterConfiguration = {}) {}
  getExtensionsKey(): string {
    return 'PostgresEntityDatabaseAdapterProvider';
  }

  installExtensions({
    EntityCompanionClass,
    EntityTableDataCoordinatorClass,
    ViewerScopedEntityCompanionClass,
    ReadonlyEntityClass,
  }: {
    EntityCompanionClass: typeof import('@expo/entity').EntityCompanion;
    EntityTableDataCoordinatorClass: typeof import('@expo/entity').EntityTableDataCoordinator;
    ViewerScopedEntityCompanionClass: typeof import('@expo/entity').ViewerScopedEntityCompanion;
    ReadonlyEntityClass: typeof import('@expo/entity').ReadonlyEntity;
  }): void {
    installEntityCompanionExtensions({ EntityCompanionClass });
    installEntityTableDataCoordinatorExtensions({ EntityTableDataCoordinatorClass });
    installViewerScopedEntityCompanionExtensions({ ViewerScopedEntityCompanionClass });
    installReadonlyEntityExtensions({ ReadonlyEntityClass });
  }

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new PostgresEntityDatabaseAdapter(entityConfiguration, this.configuration);
  }
}
