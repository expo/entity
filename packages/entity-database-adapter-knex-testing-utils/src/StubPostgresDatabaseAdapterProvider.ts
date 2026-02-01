import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';
import {
  installEntityCompanionExtensions,
  installEntityTableDataCoordinatorExtensions,
  installReadonlyEntityExtensions,
  installViewerScopedEntityCompanionExtensions,
} from '@expo/entity-database-adapter-knex';

import { StubPostgresDatabaseAdapter } from './StubPostgresDatabaseAdapter';

export class StubPostgresDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  getExtensionsKey(): string {
    return 'StubPostgresDatabaseAdapterProvider';
  }

  installExtensions(): void {
    installEntityCompanionExtensions();
    installEntityTableDataCoordinatorExtensions();
    installViewerScopedEntityCompanionExtensions();
    installReadonlyEntityExtensions();
  }

  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new StubPostgresDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}
