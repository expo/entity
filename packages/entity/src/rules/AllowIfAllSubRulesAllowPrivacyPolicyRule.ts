import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import { ReadonlyEntity } from '../ReadonlyEntity';
import { ViewerContext } from '../ViewerContext';
import { PrivacyPolicyRule, RuleEvaluationResult } from './PrivacyPolicyRule';

export class AllowIfAllSubRulesAllowPrivacyPolicyRule<
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
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
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
    return results.every((result) => result === RuleEvaluationResult.ALLOW)
      ? RuleEvaluationResult.ALLOW
      : RuleEvaluationResult.SKIP;
  }
}
