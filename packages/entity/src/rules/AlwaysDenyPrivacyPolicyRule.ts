import { RuleComplexity, RuleEvaluationResult } from './PrivacyPolicyRuleEnums';
import { DenyOrSkipPrivacyPolicyRule } from './PrivacyPolicyRuleTypes';
import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';

/**
 * Privacy policy rule that always denies.
 */
export default class AlwaysDenyPrivacyPolicyRule<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends DenyOrSkipPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  override complexity = RuleComplexity.CONSTANT_TIME;

  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    _evaluationContext: EntityPrivacyPolicyEvaluationContext,
    _entity: TEntity
  ): Promise<RuleEvaluationResult.DENY | RuleEvaluationResult.SKIP> {
    return RuleEvaluationResult.DENY;
  }
}
