import {
  EntityCompanion,
  EntityPrivacyPolicy,
  IEntityClass,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import { KnexEntityLoaderFactory } from '../KnexEntityLoaderFactory';
import { getKnexDataManager } from './getKnexDataManager';
import { computeIfAbsentInWeakMap } from './weakMaps';

const knexEntityLoaderFactoryCache = new WeakMap<
  EntityCompanion<any, any, any, any, any, any>,
  KnexEntityLoaderFactory<any, any, any, any, any, any>
>();

export function getKnexEntityLoaderFactory<
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
): KnexEntityLoaderFactory<
  TFields,
  TIDField,
  TViewerContext,
  TEntity,
  TPrivacyPolicy,
  TSelectedFields
> {
  return computeIfAbsentInWeakMap(
    knexEntityLoaderFactoryCache,
    viewerContext.entityCompanionProvider.getCompanionForEntity(entityClass),
    (companion) =>
      new KnexEntityLoaderFactory(
        companion,
        getKnexDataManager(companion.tableDataCoordinator),
        companion.metricsAdapter,
      ),
  );
}
