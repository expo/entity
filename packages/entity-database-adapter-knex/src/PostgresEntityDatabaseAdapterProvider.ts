import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';

import { PostgresEntityDatabaseAdapter } from './PostgresEntityDatabaseAdapter';

export interface PostgresEntityDatabaseAdapterConfiguration {
  /**
   * Maximum page size for pagination (first/last parameters).
   * If not specified, no limit is enforced.
   */
  paginationMaxPageSize?: number;
}

export class PostgresEntityDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  constructor(private readonly configuration: PostgresEntityDatabaseAdapterConfiguration = {}) {}

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new PostgresEntityDatabaseAdapter(entityConfiguration, this.configuration);
  }
}
