import {
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityClass,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from './EnforcingKnexEntityLoader';
import {
  knexLoader as knexLoaderFn,
  knexLoaderWithAuthorizationResults as knexLoaderWithAuthorizationResultsFn,
} from './knexLoader';

/**
 * Abstract base class for readonly entities backed by Postgres.
 * Provides `knexLoader` and `knexLoaderWithAuthorizationResults` as inherited static methods.
 *
 * Entities that should not be mutated (e.g., representing SQL views or immutable tables)
 * can extend this class instead of `ReadonlyEntity` to get knex loader ergonomics.
 */
export abstract class ReadonlyPostgresEntity<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields> {
  /**
   * Vend knex loader for loading entities via non-data-loader methods in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static knexLoader<
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
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
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
    return knexLoaderFn(this, viewerContext, queryContext);
  }

  /**
   * Vend knex loader for loading entities via non-data-loader methods in a given query context.
   * Returns authorization results instead of throwing on authorization errors.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static knexLoaderWithAuthorizationResults<
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
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
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
    return knexLoaderWithAuthorizationResultsFn(this, viewerContext, queryContext);
  }
}
