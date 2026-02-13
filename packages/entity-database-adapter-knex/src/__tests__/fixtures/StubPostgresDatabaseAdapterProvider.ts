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

  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new StubPostgresDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}
