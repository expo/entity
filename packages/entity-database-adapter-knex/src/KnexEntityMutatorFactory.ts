import type {
  EntityCompanion,
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationContext,
  EntityQueryContext,
  IEntityMetricsAdapter,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';
import { EntityConstructionUtils } from '@expo/entity';

import { AuthorizationResultBasedBaseKnexMutator } from './AuthorizationResultBasedBaseKnexMutator.ts';
import type { BasePostgresEntityDatabaseAdapter } from './BasePostgresEntityDatabaseAdapter.ts';
import { EnforcingBaseKnexMutator } from './EnforcingBaseKnexMutator.ts';

/**
 * The primary entry point for mutating entities via knex queries (non-data-loader methods).
 */
export class KnexEntityMutatorFactory<
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
    private readonly databaseAdapter: BasePostgresEntityDatabaseAdapter<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  /**
   * Vend knex mutator for mutating entities in a given query context.
   * @param viewerContext - viewer context of mutating user
   * @param queryContext - query context in which to perform the mutation
   */
  forMutation(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): AuthorizationResultBasedBaseKnexMutator<
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

    return new AuthorizationResultBasedBaseKnexMutator(
      queryContext,
      this.databaseAdapter,
      this.metricsAdapter,
      constructionUtils,
    );
  }

  /**
   * Vend enforcing knex mutator for mutating entities in a given query context.
   * @param viewerContext - viewer context of mutating user
   * @param queryContext - query context in which to perform the mutation
   */
  forMutationEnforcing(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): EnforcingBaseKnexMutator<
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

    return new EnforcingBaseKnexMutator(
      this.forMutation(viewerContext, queryContext, privacyPolicyEvaluationContext),
      queryContext,
      this.databaseAdapter,
      this.metricsAdapter,
      constructionUtils,
    );
  }
}
