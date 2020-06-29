import {
  IEntityDatabaseAdapterProvider,
  EntityConfiguration,
  EntityDatabaseAdapter,
} from '@expo/entity';

import PostgresEntityDatabaseAdapter from './PostgresEntityDatabaseAdapter';

export default class PostgresEntityDatabaseAdapterProvider
  implements IEntityDatabaseAdapterProvider {
  getDatabaseAdapter<TDatabaseFields>(
    entityConfiguration: EntityConfiguration<TDatabaseFields>
  ): EntityDatabaseAdapter<TDatabaseFields> {
    return new PostgresEntityDatabaseAdapter(entityConfiguration);
  }
}
