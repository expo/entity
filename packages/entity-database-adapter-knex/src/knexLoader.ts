import {
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityClass,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from './EnforcingKnexEntityLoader';
import { getKnexEntityLoaderFactory } from './internal/getKnexEntityLoaderFactory';

/**
 * Vend knex loader for loading entities via non-data-loader methods in a given query context.
 * @param entityClass - entity class to load
 * @param viewerContext - viewer context of loading user
 * @param queryContext - query context in which to perform the load
 */
export function knexLoader<
  TMFields extends object,
  TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
  TMViewerContext extends ViewerContext,
  TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
  TMPrivacyPolicy extends EntityPrivacyPolicy<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMSelectedFields
  >,
  TMSelectedFields extends keyof TMFields = keyof TMFields,
>(
  entityClass: IEntityClass<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  >,
  viewerContext: TMViewerContext,
  queryContext: EntityQueryContext = viewerContext
    .getViewerScopedEntityCompanionForClass(entityClass)
    .getQueryContextProvider()
    .getQueryContext(),
): EnforcingKnexEntityLoader<
  TMFields,
  TMIDField,
  TMViewerContext,
  TMEntity,
  TMPrivacyPolicy,
  TMSelectedFields
> {
  return getKnexEntityLoaderFactory(entityClass, viewerContext).forLoadEnforcing(
    viewerContext,
    queryContext,
    { previousValue: null, cascadingDeleteCause: null },
  );
}

/**
 * Vend knex loader for loading entities via non-data-loader methods in a given query context.
 * Returns authorization results instead of throwing on authorization errors.
 * @param entityClass - entity class to load
 * @param viewerContext - viewer context of loading user
 * @param queryContext - query context in which to perform the load
 */
export function knexLoaderWithAuthorizationResults<
  TMFields extends object,
  TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
  TMViewerContext extends ViewerContext,
  TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
  TMPrivacyPolicy extends EntityPrivacyPolicy<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMSelectedFields
  >,
  TMSelectedFields extends keyof TMFields = keyof TMFields,
>(
  entityClass: IEntityClass<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  >,
  viewerContext: TMViewerContext,
  queryContext: EntityQueryContext = viewerContext
    .getViewerScopedEntityCompanionForClass(entityClass)
    .getQueryContextProvider()
    .getQueryContext(),
): AuthorizationResultBasedKnexEntityLoader<
  TMFields,
  TMIDField,
  TMViewerContext,
  TMEntity,
  TMPrivacyPolicy,
  TMSelectedFields
> {
  return getKnexEntityLoaderFactory(entityClass, viewerContext).forLoad(
    viewerContext,
    queryContext,
    { previousValue: null, cascadingDeleteCause: null },
  );
}
