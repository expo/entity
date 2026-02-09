import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';

import { StubPostgresDatabaseAdapter } from './StubPostgresDatabaseAdapter';
import { installEntityCompanionExtensions } from '../../extensions/EntityCompanionExtensions';
import { installEntityTableDataCoordinatorExtensions } from '../../extensions/EntityTableDataCoordinatorExtensions';
import { installReadonlyEntityExtensions } from '../../extensions/ReadonlyEntityExtensions';
import { installViewerScopedEntityCompanionExtensions } from '../../extensions/ViewerScopedEntityCompanionExtensions';

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
