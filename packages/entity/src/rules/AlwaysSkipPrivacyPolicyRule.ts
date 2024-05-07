import { RuleComplexity, RuleEvaluationResult } from './PrivacyPolicyRuleEnums';
import { SkipPrivacyPolicyRule } from './PrivacyPolicyRuleTypes';
import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';

/**
 * A no-op policy rule that always skips.
 */
export default class AlwaysSkipPrivacyPolicyRule<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends SkipPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  override complexity = RuleComplexity.LOW;

  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    _evaluationContext: EntityPrivacyPolicyEvaluationContext,
    _entity: TEntity
  ): Promise<RuleEvaluationResult.SKIP> {
    return RuleEvaluationResult.SKIP;
  }
}
