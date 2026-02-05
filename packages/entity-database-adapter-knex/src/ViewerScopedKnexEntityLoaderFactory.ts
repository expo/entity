import {
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationContext,
  EntityQueryContext,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from './EnforcingKnexEntityLoader';
import { KnexEntityLoaderFactory } from './KnexEntityLoaderFactory';

/**
 * Provides a cleaner API for loading entities via knex by passing through the ViewerContext.
 */
export class ViewerScopedKnexEntityLoaderFactory<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly knexEntityLoaderFactory: KnexEntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly viewerContext: TViewerContext,
  ) {}

  forLoad(
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): AuthorizationResultBasedKnexEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.knexEntityLoaderFactory.forLoad(
      this.viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
    );
  }

  forLoadEnforcing(
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): EnforcingKnexEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.knexEntityLoaderFactory.forLoadEnforcing(
      this.viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
    );
  }
}
