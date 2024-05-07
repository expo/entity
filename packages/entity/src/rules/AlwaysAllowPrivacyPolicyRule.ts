import { RuleComplexity, RuleEvaluationResult } from './PrivacyPolicyRuleEnums';
import { AllowOrSkipPrivacyPolicyRule } from './PrivacyPolicyRuleTypes';
import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';

/**
 * Privacy policy rule that always allows.
 */
export default class AlwaysAllowPrivacyPolicyRule<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends AllowOrSkipPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  override complexity = RuleComplexity.LOW;

  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    _evaluationContext: EntityPrivacyPolicyEvaluationContext,
    _entity: TEntity
  ): Promise<RuleEvaluationResult.ALLOW | RuleEvaluationResult.SKIP> {
    return RuleEvaluationResult.ALLOW;
  }
}
