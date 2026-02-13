import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';

import { StubPostgresDatabaseAdapter } from './StubPostgresDatabaseAdapter';

export class StubPostgresDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new StubPostgresDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}
