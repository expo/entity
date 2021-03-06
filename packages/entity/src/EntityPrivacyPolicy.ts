import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityNotAuthorizedError from './errors/EntityNotAuthorizedError';
import PrivacyPolicyRule, { RuleEvaluationResult } from './rules/PrivacyPolicyRule';

export enum EntityPrivacyPolicyEvaluationMode {
  ENFORCE,
  DRY_RUN,
  ENFORCE_AND_LOG,
}

export type EntityPrivacyPolicyEvaluator<
  TFields,
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
 * A privacy policy declares lists of {@link PrivacyPolicyRule} for create, read, update, and delete actions
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
  TFields,
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
   * @throws {@link EntityNotAuthorizedError} when not authorized
   */
  async authorizeCreateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.createRules,
      viewerContext,
      queryContext,
      entity,
      EntityAuthorizationAction.CREATE
    );
  }

  /**
   * Authorize an entity against read policy.
   * @param viewerContext - viewer context of user reading the entity
   * @param queryContext - query context in which to perform the read authorization
   * @param entity - entity to authorize
   * @returns entity if authorized
   * @throws {@link EntityNotAuthorizedError} when not authorized
   */
  async authorizeReadAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.readRules,
      viewerContext,
      queryContext,
      entity,
      EntityAuthorizationAction.READ
    );
  }

  /**
   * Authorize an entity against update policy.
   * @param viewerContext - viewer context of user updating the entity
   * @param queryContext - query context in which to perform the update authorization
   * @param entity - entity to authorize
   * @returns entity if authorized
   * @throws {@link EntityNotAuthorizedError} when not authorized
   */
  async authorizeUpdateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.updateRules,
      viewerContext,
      queryContext,
      entity,
      EntityAuthorizationAction.UPDATE
    );
  }

  /**
   * Authorize an entity against deletion policy.
   * @param viewerContext - viewer context of user deleting the entity
   * @param queryContext - query context in which to perform the delete authorization
   * @param entity - entity to authorize
   * @returns entity if authorized
   * @throws {@link EntityNotAuthorizedError} when not authorized
   */
  async authorizeDeleteAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<TEntity> {
    return await this.authorizeForRulesetAsync(
      this.deleteRules,
      viewerContext,
      queryContext,
      entity,
      EntityAuthorizationAction.DELETE
    );
  }

  private async authorizeForRulesetAsync(
    ruleset: readonly PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>[],
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity,
    action: EntityAuthorizationAction
  ): Promise<TEntity> {
    const privacyPolicyEvaluator = this.getPrivacyPolicyEvaluator(viewerContext);
    switch (privacyPolicyEvaluator.mode) {
      case EntityPrivacyPolicyEvaluationMode.ENFORCE:
        return await this.authorizeForRulesetInnerAsync(
          ruleset,
          viewerContext,
          queryContext,
          entity,
          action
        );
      case EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG:
        try {
          return await this.authorizeForRulesetInnerAsync(
            ruleset,
            viewerContext,
            queryContext,
            entity,
            action
          );
        } catch (e) {
          if (!(e instanceof EntityNotAuthorizedError)) {
            throw e;
          }
          privacyPolicyEvaluator.denyHandler(e);
          throw e;
        }
      case EntityPrivacyPolicyEvaluationMode.DRY_RUN:
        try {
          return await this.authorizeForRulesetInnerAsync(
            ruleset,
            viewerContext,
            queryContext,
            entity,
            action
          );
        } catch (e) {
          if (!(e instanceof EntityNotAuthorizedError)) {
            throw e;
          }
          privacyPolicyEvaluator.denyHandler(e);
          return entity;
        }
    }
  }

  private async authorizeForRulesetInnerAsync(
    ruleset: readonly PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>[],
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity,
    action: EntityAuthorizationAction
  ): Promise<TEntity> {
    for (let i = 0; i < ruleset.length; i++) {
      const rule = ruleset[i];
      const ruleEvaluationResult = await rule.evaluateAsync(viewerContext, queryContext, entity);
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
          throw new Error('should not be a fourth type of rule evaluation result');
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
