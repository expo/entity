import {
  IEntityDatabaseAdapterProvider,
  EntityConfiguration,
  EntityDatabaseAdapter,
} from '@expo/entity';

import PostgresEntityDatabaseAdapter from './PostgresEntityDatabaseAdapter';

export default class PostgresEntityDatabaseAdapterProvider
  implements IEntityDatabaseAdapterProvider
{
  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new PostgresEntityDatabaseAdapter(entityConfiguration);
  }
}
