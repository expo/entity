import PrivacyPolicyRule, { RuleEvaluationResult } from './PrivacyPolicyRule';
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
  TSelectedFields extends keyof TFields = keyof TFields,
> extends PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    _evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    _entity: TEntity,
  ): Promise<RuleEvaluationResult> {
    return RuleEvaluationResult.SKIP;
  }
}
