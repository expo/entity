import { EntityDatabaseAdapter, EntityTableDataCoordinator } from '@expo/entity';
import assert from 'assert';

import { BasePostgresEntityDatabaseAdapter } from '../BasePostgresEntityDatabaseAdapter';
import { EntityKnexDataManager } from '../internal/EntityKnexDataManager';

const KNEX_DATA_MANAGER = Symbol('knexDataManager');

declare module '@expo/entity' {
  interface EntityTableDataCoordinator<
    TFields extends Record<string, any>,
    TIDField extends keyof TFields,
  > {
    [KNEX_DATA_MANAGER]: EntityKnexDataManager<TFields, TIDField> | undefined;
    getKnexDataManager(): EntityKnexDataManager<TFields, TIDField>;
  }
}

function requireBasePostgresAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>,
): BasePostgresEntityDatabaseAdapter<TFields, TIDField> {
  assert(
    databaseAdapter instanceof BasePostgresEntityDatabaseAdapter,
    `Cannot create KnexDataManager for EntityTableDataCoordinator with non-Postgres database adapter.`,
  );
  return databaseAdapter;
}

export function installEntityTableDataCoordinatorExtensions({
  EntityTableDataCoordinatorClass,
}: {
  EntityTableDataCoordinatorClass: typeof EntityTableDataCoordinator;
}): void {
  EntityTableDataCoordinatorClass.prototype.getKnexDataManager = function <
    TFields extends Record<string, any>,
    TIDField extends keyof TFields,
  >(this: EntityTableDataCoordinator<TFields, TIDField>): EntityKnexDataManager<TFields, TIDField> {
    return (this[KNEX_DATA_MANAGER] ??= new EntityKnexDataManager(
      this.entityConfiguration,
      requireBasePostgresAdapter(this.databaseAdapter),
      this.metricsAdapter,
      this.entityClassName,
    ));
  };
}
