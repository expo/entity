import { EntityAuthorizationAction } from '../EntityPrivacyPolicy.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError.ts';

/**
 * Description of a single privacy policy rule as it participated in a denied evaluation.
 */
export type EntityNotAuthorizedRuleInfo = {
  /**
   * Index of the rule within the ruleset for the action.
   */
  ruleIndex: number;

  /**
   * Class name of the rule.
   */
  ruleName: string;

  /**
   * Reason codes the rule attached to its SKIP or DENY result. Empty when the rule returned a bare result.
   */
  reasons: readonly string[];
};

/**
 * How a privacy policy evaluation arrived at a denial.
 */
export enum EntityNotAuthorizedDenialType {
  /**
   * A rule explicitly returned DENY. Rules after it were not evaluated.
   */
  RULE_DENIED = 'RULE_DENIED',

  /**
   * Every rule in the ruleset returned SKIP. None of the rules allowed the action.
   */
  ALL_RULES_SKIPPED = 'ALL_RULES_SKIPPED',
}

/**
 * Why a privacy policy evaluation was denied.
 */
export type EntityNotAuthorizedDenialReason =
  | {
      type: EntityNotAuthorizedDenialType.RULE_DENIED;
      /**
       * The rule that returned DENY. Rules after it were not evaluated.
       */
      rule: EntityNotAuthorizedRuleInfo;
      /**
       * Rules evaluated before the denying rule, all of which returned SKIP.
       */
      skippedRules: readonly EntityNotAuthorizedRuleInfo[];
    }
  | {
      type: EntityNotAuthorizedDenialType.ALL_RULES_SKIPPED;
      skippedRules: readonly EntityNotAuthorizedRuleInfo[];
    };

/**
 * A denial explanation that is safe to display to an end user.
 */
export type EntityNotAuthorizedUserFacingReason = {
  /**
   * Machine-readable code, stable across message wording changes. Suitable for localization keys
   * and for mapping to transport-level errors.
   */
  code: string;

  /**
   * Human-readable message suitable for display to the end user.
   */
  message: string;
};

/**
 * Error thrown when viewer context is not authorized to perform an action on an entity.
 */
export class EntityNotAuthorizedError<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityError {
  static {
    this.prototype.name = 'EntityNotAuthorizedError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_NOT_AUTHORIZED {
    return EntityErrorCode.ERR_ENTITY_NOT_AUTHORIZED;
  }

  public readonly entityClassName: string;
  public readonly entityID: string;
  public readonly action: EntityAuthorizationAction;

  /**
   * Structured, developer-facing explanation of the denial. May reveal privacy policy structure
   * and facts about the entity and viewer; it is intentionally excluded from `message` and must
   * not be surfaced directly to end users.
   */
  public readonly denialReason: EntityNotAuthorizedDenialReason;

  /**
   * End-user-safe explanation supplied by the privacy policy, if any.
   * See EntityPrivacyPolicy.getUserFacingDenialReason.
   */
  public readonly userFacingDenialReason: EntityNotAuthorizedUserFacingReason | null;

  constructor(
    entity: TEntity,
    viewerContext: TViewerContext,
    action: EntityAuthorizationAction,
    denialReason: EntityNotAuthorizedDenialReason,
    userFacingDenialReason: EntityNotAuthorizedUserFacingReason | null = null,
  ) {
    const ruleIndex =
      denialReason.type === EntityNotAuthorizedDenialType.RULE_DENIED
        ? denialReason.rule.ruleIndex
        : -1;

    const entityString = `${entity.constructor.name}[${entity.getID()}]`;

    super(
      `Entity not authorized: ${entityString} (viewer = ${viewerContext}, action = ${EntityAuthorizationAction[action]}, ruleIndex = ${ruleIndex})`,
    );
    this.entityClassName = entity.constructor.name;
    this.entityID = String(entity.getID());
    this.action = action;
    this.denialReason = denialReason;
    this.userFacingDenialReason = userFacingDenialReason;
  }
}
