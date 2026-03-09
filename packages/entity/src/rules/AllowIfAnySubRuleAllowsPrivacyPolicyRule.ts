import type { EntityPrivacyPolicyRuleEvaluationContext } from '../EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from '../EntityQueryContext.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import { PrivacyPolicyRule, RuleEvaluationResult } from './PrivacyPolicyRule.ts';

export class AllowIfAnySubRuleAllowsPrivacyPolicyRule<
  TFields extends object,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends PrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  constructor(
    private readonly subRules: PrivacyPolicyRule<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >[],
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
    const results = await Promise.all(
      this.subRules.map((subRule) =>
        subRule.evaluateAsync(viewerContext, queryContext, evaluationContext, entity),
      ),
    );
    return results.includes(RuleEvaluationResult.ALLOW)
      ? RuleEvaluationResult.ALLOW
      : RuleEvaluationResult.SKIP;
  }
}
