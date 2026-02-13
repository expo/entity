import { EntityDatabaseAdapter, EntityTableDataCoordinator } from '@expo/entity';
import assert from 'assert';

import { BasePostgresEntityDatabaseAdapter } from '../BasePostgresEntityDatabaseAdapter';
import { EntityKnexDataManager } from './EntityKnexDataManager';
import { computeIfAbsentInWeakMap } from './weakMaps';

const knexDataManagerCache = new WeakMap<
  EntityTableDataCoordinator<any, any>,
  EntityKnexDataManager<any, any>
>();

export function getKnexDataManager<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  tableDataCoordinator: EntityTableDataCoordinator<TFields, TIDField>,
): EntityKnexDataManager<TFields, TIDField> {
  return computeIfAbsentInWeakMap(
    knexDataManagerCache,
    tableDataCoordinator,
    (coordinator) =>
      new EntityKnexDataManager(
        coordinator.entityConfiguration,
        requireBasePostgresAdapter(coordinator.databaseAdapter),
        coordinator.metricsAdapter,
        coordinator.entityClassName,
      ),
  );
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
