import AuthorizationResultBasedEntityLoader from './AuthorizationResultBasedEntityLoader';
import EntityCompanion from './EntityCompanion';
import EntityLoaderUtils from './EntityLoaderUtils';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityDataManager from './internal/EntityDataManager';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';

/**
 * The primary entry point for loading entities.
 */
export default class EntityLoaderFactory<
  TFields extends Record<string, any>,
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
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly entityCompanion: EntityCompanion<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly dataManager: EntityDataManager<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  /**
   * Vend loader for loading an entity in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  forLoad(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): AuthorizationResultBasedEntityLoader<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    const utils = new EntityLoaderUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      this.entityCompanion.entityCompanionDefinition.entityConfiguration,
      this.entityCompanion.entityCompanionDefinition.entityClass,
      this.entityCompanion.entityCompanionDefinition.entitySelectedFields,
      this.entityCompanion.privacyPolicy,
      this.dataManager,
      this.metricsAdapter,
    );

    return new AuthorizationResultBasedEntityLoader(
      queryContext,
      this.entityCompanion.entityCompanionDefinition.entityConfiguration,
      this.entityCompanion.entityCompanionDefinition.entityClass,
      this.dataManager,
      this.metricsAdapter,
      utils,
    );
  }
}
