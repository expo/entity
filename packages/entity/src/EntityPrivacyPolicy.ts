import { EntityCascadingDeletionInfo } from './EntityMutationInfo';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityNotAuthorizedError from './errors/EntityNotAuthorizedError';
import IEntityMetricsAdapter, {
  EntityMetricsAuthorizationResult,
} from './metrics/IEntityMetricsAdapter';
import PrivacyPolicyRule, { RuleEvaluationResult } from './rules/PrivacyPolicyRule';

/**
 * Information about the reason this privacy policy is being evaluated.
 */
export type EntityPrivacyPolicyEvaluationContext<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> = {
  /**
   * When this privacy policy is being evaluated as a result of an update, this will be populated with the value
   * of the entity before the update. Note that this doesn't only apply to UPDATE authorization actions though:
   * when an entity is updated it is re-LOADed after the update completes.
   */
  previousValue: TEntity | null;
  /**
   * When this privacy policy is being evaluated as a result of a cascading deletion, this will be populated
   * with information on the cascading delete.
   */
  cascadingDeleteCause: EntityCascadingDeletionInfo | null;
};

/**
 * Evaluation mode for a EntityPrivacyPolicy. Useful when transitioning to
 * using Entity for privacy.
 */
export enum EntityPrivacyPolicyEvaluationMode {
  /**
   * Enforce this privacy policy. Throw upon denial.
   */
  ENFORCE,

  /**
   * Do not enforce this privacy policy. Always allow but log when it would have denied.
   */
  DRY_RUN,

  /**
   * Enforce this privacy policy. Throw and log upon denial.
   */
  ENFORCE_AND_LOG,
}

export type EntityPrivacyPolicyEvaluator<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> =
  | {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE;
    }
  | {
      mode: EntityPrivacyPolicyEvaluationMode.DRY_RUN;
      denyHandler: (
        error: EntityNotAuthorizedError<TFields, TID, TViewerContext, TEntity, TSelectedFields>
      ) => void;
    }
  | {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG;
      denyHandler: (
        error: EntityNotAuthorizedError<TFields, TID, TViewerContext, TEntity, TSelectedFields>
      ) => void;
    };

export enum EntityAuthorizationAction {
  CREATE,
  READ,
  UPDATE,
  DELETE,
}

/**
 * Privacy policy for an entity.
 *
 * @remarks
 *
 * A privacy policy declares lists of PrivacyPolicyRule for create, read, update, and delete actions
 * for an entity and provides logic for authorizing an entity against rules.
 *
 * Evaluation of a list of rules is performed according the following example. This allows constructing of
 * complex yet testable permissioning logic for an entity.
 *
 * @example
 *
 * ```
 * foreach rule in rules:
 *   return authorized if rule allows
 *   return not authorized if rule denies
 *   continue to next rule if rule skips
 * return not authorized if all rules skip
 * ```
 */
export default abstract class EntityPrivacyPolicy<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  protected readonly createRules: readonly PrivacyPolicyRule<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[] = [];
  protected readonly readRules: readonly PrivacyPolicyRule<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[] = [];
  protected readonly updateRules: readonly PrivacyPolicyRule<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[] = [];
  protected readonly deleteRules: readonly PrivacyPolicyRule<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[] = [];

  /**
   * Get the privacy policy evaluation mode and deny handler for this policy.
   * Defaults to normal enforcing policy.
   *
   * @remarks
   *
   * Override to enable dry run evaluation of the policy.
   */
  protected getPrivacyPolicyEvaluator(
    _viewerContext: TViewerContext
  ): EntityPrivacyPolicyEvaluator<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
    };
  }

  /**
   * Authorize an entity against creation policy.
   * @param viewerContext - viewer context of user creating the entity
   * @param queryContext - query context in which to perform the create authorization
   * @param entity - entity to authorize
   * @returns entity if authorized
   * @throws EntityNotAuthorizedError when not authorized
   */
  async authorizeCreateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
    metricsAdapter: IEntityMetricsAdapter
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.createRules,
      viewerContext,
      queryContext,
      evaluationContext,
      entity,
      EntityAuthorizationAction.CREATE,
      metricsAdapter
    );
  }

  /**
   * Authorize an entity against read policy.
   * @param viewerContext - viewer context of user reading the entity
   * @param queryContext - query context in which to perform the read authorization
   * @param entity - entity to authorize
   * @returns entity if authorized
   * @throws EntityNotAuthorizedError when not authorized
   */
  async authorizeReadAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
    metricsAdapter: IEntityMetricsAdapter
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.readRules,
      viewerContext,
      queryContext,
      evaluationContext,
      entity,
      EntityAuthorizationAction.READ,
      metricsAdapter
    );
  }

  /**
   * Authorize an entity against update policy.
   * @param viewerContext - viewer context of user updating the entity
   * @param queryContext - query context in which to perform the update authorization
   * @param entity - entity to authorize
   * @returns entity if authorized
   * @throws EntityNotAuthorizedError when not authorized
   */
  async authorizeUpdateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
    metricsAdapter: IEntityMetricsAdapter
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.updateRules,
      viewerContext,
      queryContext,
      evaluationContext,
      entity,
      EntityAuthorizationAction.UPDATE,
      metricsAdapter
    );
  }

  /**
   * Authorize an entity against deletion policy.
   * @param viewerContext - viewer context of user deleting the entity
   * @param queryContext - query context in which to perform the delete authorization
   * @param entity - entity to authorize
   * @returns entity if authorized
   * @throws EntityNotAuthorizedError when not authorized
   */
  async authorizeDeleteAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
    metricsAdapter: IEntityMetricsAdapter
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.deleteRules,
      viewerContext,
      queryContext,
      evaluationContext,
      entity,
      EntityAuthorizationAction.DELETE,
      metricsAdapter
    );
  }

  private async authorizeForRulesetAsync(
    ruleset: readonly PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>[],
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
    action: EntityAuthorizationAction,
    metricsAdapter: IEntityMetricsAdapter
  ): Promise<TEntity> {
    const privacyPolicyEvaluator = this.getPrivacyPolicyEvaluator(viewerContext);
    switch (privacyPolicyEvaluator.mode) {
      case EntityPrivacyPolicyEvaluationMode.ENFORCE:
        try {
          const result = await this.authorizeForRulesetInnerAsync(
            ruleset,
            viewerContext,
            queryContext,
            evaluationContext,
            entity,
            action
          );
          metricsAdapter.logAuthorizationEvent({
            entityClassName: entity.constructor.name,
            action,
            evaluationResult: EntityMetricsAuthorizationResult.ALLOW,
            privacyPolicyEvaluationMode: privacyPolicyEvaluator.mode,
          });
          return result;
        } catch (e) {
          if (!(e instanceof EntityNotAuthorizedError)) {
            throw e;
          }
          metricsAdapter.logAuthorizationEvent({
            entityClassName: entity.constructor.name,
            action,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: privacyPolicyEvaluator.mode,
          });
          throw e;
        }
      case EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG:
        try {
          const result = await this.authorizeForRulesetInnerAsync(
            ruleset,
            viewerContext,
            queryContext,
            evaluationContext,
            entity,
            action
          );
          metricsAdapter.logAuthorizationEvent({
            entityClassName: entity.constructor.name,
            action,
            evaluationResult: EntityMetricsAuthorizationResult.ALLOW,
            privacyPolicyEvaluationMode: privacyPolicyEvaluator.mode,
          });
          return result;
        } catch (e) {
          if (!(e instanceof EntityNotAuthorizedError)) {
            throw e;
          }
          privacyPolicyEvaluator.denyHandler(e);
          metricsAdapter.logAuthorizationEvent({
            entityClassName: entity.constructor.name,
            action,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: privacyPolicyEvaluator.mode,
          });
          throw e;
        }
      case EntityPrivacyPolicyEvaluationMode.DRY_RUN:
        try {
          const result = await this.authorizeForRulesetInnerAsync(
            ruleset,
            viewerContext,
            queryContext,
            evaluationContext,
            entity,
            action
          );
          metricsAdapter.logAuthorizationEvent({
            entityClassName: entity.constructor.name,
            action,
            evaluationResult: EntityMetricsAuthorizationResult.ALLOW,
            privacyPolicyEvaluationMode: privacyPolicyEvaluator.mode,
          });
          return result;
        } catch (e) {
          if (!(e instanceof EntityNotAuthorizedError)) {
            throw e;
          }
          privacyPolicyEvaluator.denyHandler(e);
          metricsAdapter.logAuthorizationEvent({
            entityClassName: entity.constructor.name,
            action,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: privacyPolicyEvaluator.mode,
          });
          return entity;
        }
    }
  }

  private async authorizeForRulesetInnerAsync(
    ruleset: readonly PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>[],
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
    action: EntityAuthorizationAction
  ): Promise<TEntity> {
    for (let i = 0; i < ruleset.length; i++) {
      const rule = ruleset[i]!;
      const ruleEvaluationResult = await rule.evaluateAsync(
        viewerContext,
        queryContext,
        evaluationContext,
        entity
      );
      switch (ruleEvaluationResult) {
        case RuleEvaluationResult.DENY:
          throw new EntityNotAuthorizedError<
            TFields,
            TID,
            TViewerContext,
            TEntity,
            TSelectedFields
          >(entity, viewerContext, action, i);
        case RuleEvaluationResult.SKIP:
          continue;
        case RuleEvaluationResult.ALLOW:
          return entity;
        default:
          throw new Error(
            `Invalid RuleEvaluationResult returned from rule: ${entity} (viewer = ${viewerContext}, action = ${EntityAuthorizationAction[action]}, ruleIndex = ${i})`
          );
      }
    }

    throw new EntityNotAuthorizedError<TFields, TID, TViewerContext, TEntity, TSelectedFields>(
      entity,
      viewerContext,
      action,
      -1
    );
  }
}
