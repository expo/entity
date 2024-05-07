import { EntityPrivacyPolicyEvaluationContext } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import ReadonlyEntity from '../../ReadonlyEntity';
import ViewerContext from '../../ViewerContext';
import {
  RuleComplexity,
  RuleEvaluationResult,
  RuleEvaluationResultType,
} from '../PrivacyPolicyRuleEnums';

/**
 * A single unit of which declarative privacy policies are composed, allowing for simple
 * expression and testing of authorization logic.
 *
 * @remarks
 *
 * Each rule is responsible for returning a ruling of ALLOW, DENY, or SKIP for a condition
 * that it is checking for. While rules can return any of these, it is most common for
 * rules to return ALLOW or SKIP, explicitly authorizing or deferring authorization to the next
 * rule in the privacy policy. If all rules in the policy SKIP, the policy is denied.
 *
 * Returning DENY from a rule is useful in a few notable cases:
 * - Preventing a CRUD action on an entity (AlwaysDenyPrivacyPolicyRule)
 * - Blocking. For example, a user blocks another user from seeing their posts, and the rule
 *   would be named something like `DenyIfViewerHasBeenBlockedPrivacyPolicyRule`.
 */
export abstract class PrivacyPolicyRuleInternal<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  /**
   * Estimated complexity of a privacy policy rule. Used for automatic (safe) rule reordering.
   * Typed as a number so that applications can define their own complexity scale.
   */
  abstract readonly complexity: RuleComplexity;

  abstract evaluateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext,
    entity: TEntity
  ): Promise<RuleEvaluationResult>;

  abstract readonly resultType: RuleEvaluationResultType;
}
