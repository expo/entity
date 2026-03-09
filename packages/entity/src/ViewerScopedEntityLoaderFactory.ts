import type { AuthorizationResultBasedEntityLoader } from './AuthorizationResultBasedEntityLoader';
import type { EntityConstructionUtils } from './EntityConstructionUtils';
import type { EntityInvalidationUtils } from './EntityInvalidationUtils';
import type { EntityLoaderFactory } from './EntityLoaderFactory';
import type {
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationContext,
} from './EntityPrivacyPolicy';
import type { EntityQueryContext } from './EntityQueryContext';
import type { ReadonlyEntity } from './ReadonlyEntity';
import type { ViewerContext } from './ViewerContext';

/**
 * Provides a cleaner API for loading entities by passing through the ViewerContext.
 */
export class ViewerScopedEntityLoaderFactory<
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
    private readonly entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly viewerContext: TViewerContext,
  ) {}

  invalidationUtils(): EntityInvalidationUtils<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityLoaderFactory.invalidationUtils();
  }

  constructionUtils(
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): EntityConstructionUtils<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityLoaderFactory.constructionUtils(
      this.viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
    );
  }

  forLoad(
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): AuthorizationResultBasedEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityLoaderFactory.forLoad(
      this.viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
    );
  }
}
