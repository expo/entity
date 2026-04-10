import type {
  EntityCompanion,
  EntityPrivacyPolicy,
  IEntityClass,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import type { BasePostgresEntityDatabaseAdapter } from '../BasePostgresEntityDatabaseAdapter.ts';
import { KnexEntityMutatorFactory } from '../KnexEntityMutatorFactory.ts';
import { computeIfAbsentInWeakMap } from './weakMaps.ts';

const knexEntityMutatorFactoryCache = new WeakMap<
  EntityCompanion<any, any, any, any, any, any>,
  KnexEntityMutatorFactory<any, any, any, any, any, any>
>();

export function getKnexEntityMutatorFactory<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TViewerContext2 extends TViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  entityClass: IEntityClass<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >,
  viewerContext: TViewerContext2,
): KnexEntityMutatorFactory<
  TFields,
  TIDField,
  TViewerContext,
  TEntity,
  TPrivacyPolicy,
  TSelectedFields
> {
  return computeIfAbsentInWeakMap(
    knexEntityMutatorFactoryCache,
    viewerContext.entityCompanionProvider.getCompanionForEntity(entityClass),
    (companion) =>
      new KnexEntityMutatorFactory(
        companion,
        companion.tableDataCoordinator.databaseAdapter as BasePostgresEntityDatabaseAdapter<
          TFields,
          TIDField
        >,
        companion.metricsAdapter,
      ),
  );
}
