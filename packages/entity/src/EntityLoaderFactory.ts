import { AuthorizationResultBasedEntityLoader } from './AuthorizationResultBasedEntityLoader.ts';
import type { EntityCompanion } from './EntityCompanion.ts';
import { EntityConstructionUtils } from './EntityConstructionUtils.ts';
import { EntityInvalidationUtils } from './EntityInvalidationUtils.ts';
import type {
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationContext,
} from './EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from './EntityQueryContext.ts';
import type { ReadonlyEntity } from './ReadonlyEntity.ts';
import type { ViewerContext } from './ViewerContext.ts';
import type { EntityDataManager } from './internal/EntityDataManager.ts';
import type { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter.ts';

/**
 * The primary entry point for loading entities.
 */
export class EntityLoaderFactory<
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
    private readonly entityCompanion: EntityCompanion<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly dataManager: EntityDataManager<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  invalidationUtils(): EntityInvalidationUtils<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  > {
    return new EntityInvalidationUtils(
      this.entityCompanion.entityCompanionDefinition.entityConfiguration,
      this.dataManager,
      this.metricsAdapter,
    );
  }

  constructionUtils(
    viewerContext: TViewerContext,
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
    return new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      this.entityCompanion.entityCompanionDefinition.entityConfiguration,
      this.entityCompanion.entityCompanionDefinition.entityClass,
      this.entityCompanion.entityCompanionDefinition.entitySelectedFields,
      this.entityCompanion.privacyPolicy,
      this.metricsAdapter,
    );
  }

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
    const constructionUtils = this.constructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
    );

    return new AuthorizationResultBasedEntityLoader(
      queryContext,
      this.entityCompanion.entityCompanionDefinition.entityConfiguration,
      this.entityCompanion.entityCompanionDefinition.entityClass,
      this.dataManager,
      constructionUtils,
    );
  }
}
