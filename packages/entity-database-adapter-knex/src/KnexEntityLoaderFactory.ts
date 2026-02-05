import {
  EntityCompanion,
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationContext,
  EntityQueryContext,
  ReadonlyEntity,
  ViewerContext,
  IEntityMetricsAdapter,
} from '@expo/entity';
import { EntityConstructionUtils } from '@expo/entity/src/EntityConstructionUtils';

import { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from './EnforcingKnexEntityLoader';
import { EntityKnexDataManager } from './internal/EntityKnexDataManager';

/**
 * The primary entry point for loading entities via knex queries (non-data-loader methods).
 */
export class KnexEntityLoaderFactory<
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
    private readonly knexDataManager: EntityKnexDataManager<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  /**
   * Vend knex loader for loading an entity in a given query context.
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
  ): AuthorizationResultBasedKnexEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      this.entityCompanion.entityCompanionDefinition.entityConfiguration,
      this.entityCompanion.entityCompanionDefinition.entityClass,
      this.entityCompanion.entityCompanionDefinition.entitySelectedFields,
      this.entityCompanion.privacyPolicy,
      this.metricsAdapter,
    );

    return new AuthorizationResultBasedKnexEntityLoader(
      queryContext,
      this.knexDataManager,
      this.metricsAdapter,
      constructionUtils,
    );
  }

  /**
   * Vend enforcing knex loader for loading an entity in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  forLoadEnforcing(
    viewerContext: TViewerContext,
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
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      this.entityCompanion.entityCompanionDefinition.entityConfiguration,
      this.entityCompanion.entityCompanionDefinition.entityClass,
      this.entityCompanion.entityCompanionDefinition.entitySelectedFields,
      this.entityCompanion.privacyPolicy,
      this.metricsAdapter,
    );

    return new EnforcingKnexEntityLoader(
      this.forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext),
      queryContext,
      this.knexDataManager,
      this.metricsAdapter,
      constructionUtils,
    );
  }
}
