import type { EntityPrivacyPolicyRuleEvaluationContext } from '../EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from '../EntityQueryContext.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import { PrivacyPolicyRule, RuleEvaluationResult } from './PrivacyPolicyRule.ts';

export class EvaluateIfEntityFieldPredicatePrivacyPolicyRule<
  TFields extends object,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  N extends TSelectedFields,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends PrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  constructor(
    private readonly fieldName: N,
    private readonly shouldEvaluatePredicate: (fieldValue: TFields[N]) => boolean,
    private readonly rule: PrivacyPolicyRule<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ) {
    super();
  }

  async evaluateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyRuleEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
  ): Promise<RuleEvaluationResult> {
    const fieldValue = entity.getField(this.fieldName);
    return this.shouldEvaluatePredicate(fieldValue)
      ? await this.rule.evaluateAsync(viewerContext, queryContext, evaluationContext, entity)
      : RuleEvaluationResult.SKIP;
  }
}
