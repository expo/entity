import {
  IEntityDatabaseAdapterProvider,
  EntityConfiguration,
  EntityDatabaseAdapter,
} from '@expo/entity';

import PostgresEntityDatabaseAdapter from './PostgresEntityDatabaseAdapter';

export default class PostgresEntityDatabaseAdapterProvider
  implements IEntityDatabaseAdapterProvider
{
  getDatabaseAdapter<TFields extends Record<string, any>>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityDatabaseAdapter<TFields> {
    return new PostgresEntityDatabaseAdapter(entityConfiguration);
  }
}
