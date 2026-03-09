import type { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from '../EntityQueryContext.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import { PrivacyPolicyRule, RuleEvaluationResult } from './PrivacyPolicyRule.ts';

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
