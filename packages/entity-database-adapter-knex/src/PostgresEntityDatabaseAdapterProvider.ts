import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';

import { PostgresEntityDatabaseAdapter } from './PostgresEntityDatabaseAdapter';

export class PostgresEntityDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new PostgresEntityDatabaseAdapter(entityConfiguration);
  }
}
