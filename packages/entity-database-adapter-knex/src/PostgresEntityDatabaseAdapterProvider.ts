import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  EntityKnexDatabaseAdapter,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';

import { PostgresEntityDatabaseAdapter } from './PostgresEntityDatabaseAdapter';
import { PostgresEntityKnexDatabaseAdapter } from './PostgresEntityKnexDatabaseAdapter';

export class PostgresEntityDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly postgresEntityDatabaseAdapters = new Map<
    EntityConfiguration<any, any>,
    PostgresEntityDatabaseAdapter<any, any>
  >();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    let adapter = this.postgresEntityDatabaseAdapters.get(entityConfiguration);
    if (!adapter) {
      adapter = new PostgresEntityDatabaseAdapter(entityConfiguration);
      this.postgresEntityDatabaseAdapters.set(entityConfiguration, adapter);
    }
    return adapter as PostgresEntityDatabaseAdapter<TFields, TIDField>;
  }

  getKnexDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityKnexDatabaseAdapter<TFields, TIDField> {
    // Get the regular adapter to access its field transformer map
    const databaseAdapter = this.getDatabaseAdapter(
      entityConfiguration,
    ) as PostgresEntityDatabaseAdapter<TFields, TIDField>;
    // Since getFieldTransformerMap is protected, we need to make it accessible
    // For now, we'll create a new instance
    return new PostgresEntityKnexDatabaseAdapter(
      entityConfiguration,
      (databaseAdapter as any).getFieldTransformerMap(),
    );
  }
}
