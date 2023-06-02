import EntityLoader from './EntityLoader';
import EntityLoaderFactory from './EntityLoaderFactory';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Provides a cleaner API for loading entities by passing through the ViewerContext.
 */
export default class ViewerScopedEntityLoaderFactory<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields
> {
  constructor(
    private readonly entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly viewerContext: TViewerContext
  ) {}

  forLoad(
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext
  ): EntityLoader<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
    return this.entityLoaderFactory.forLoad(
      this.viewerContext,
      queryContext,
      privacyPolicyEvaluationContext
    );
  }
}
