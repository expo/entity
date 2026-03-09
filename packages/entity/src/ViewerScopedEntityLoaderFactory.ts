import type { AuthorizationResultBasedEntityLoader } from './AuthorizationResultBasedEntityLoader.ts';
import type { EntityConstructionUtils } from './EntityConstructionUtils.ts';
import type { EntityInvalidationUtils } from './EntityInvalidationUtils.ts';
import type { EntityLoaderFactory } from './EntityLoaderFactory.ts';
import type {
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationContext,
} from './EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from './EntityQueryContext.ts';
import type { ReadonlyEntity } from './ReadonlyEntity.ts';
import type { ViewerContext } from './ViewerContext.ts';

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
