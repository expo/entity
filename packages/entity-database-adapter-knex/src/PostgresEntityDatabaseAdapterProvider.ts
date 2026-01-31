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

export class PostgresEntityDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  getExtensionsKey(): string {
    return 'PostgresEntityDatabaseAdapterProvider';
  }

  installExtensions(): void {
    installEntityCompanionExtensions();
    installEntityTableDataCoordinatorExtensions();
    installViewerScopedEntityCompanionExtensions();
    installReadonlyEntityExtensions();
  }

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new PostgresEntityDatabaseAdapter(entityConfiguration);
  }
}
