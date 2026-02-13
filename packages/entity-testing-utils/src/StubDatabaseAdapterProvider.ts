import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';

import { StubDatabaseAdapter } from './StubDatabaseAdapter';

export class StubDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new StubDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}
