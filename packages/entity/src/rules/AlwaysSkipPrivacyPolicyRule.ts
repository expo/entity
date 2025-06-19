import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import { ReadonlyEntity } from '../ReadonlyEntity';
import { ViewerContext } from '../ViewerContext';
import { PrivacyPolicyRule, RuleEvaluationResult } from './PrivacyPolicyRule';

/**
 * A no-op policy rule that always skips.
 */
export class AlwaysSkipPrivacyPolicyRule<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends PrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    _evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    _entity: TEntity,
  ): Promise<RuleEvaluationResult> {
    return RuleEvaluationResult.SKIP;
  }
}
