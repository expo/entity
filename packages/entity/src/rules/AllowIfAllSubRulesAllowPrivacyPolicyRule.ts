import type { EntityPrivacyPolicyRuleEvaluationContext } from '../EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from '../EntityQueryContext.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import type { RuleEvaluationOutcome } from './PrivacyPolicyRule.ts';
import {
  PrivacyPolicyRule,
  RuleEvaluationResult,
  normalizeRuleEvaluationOutcome,
  skipWithReasons,
} from './PrivacyPolicyRule.ts';

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
    evaluationContext: EntityPrivacyPolicyRuleEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
  ): Promise<RuleEvaluationOutcome> {
    if (this.subRules.length === 0) {
      return RuleEvaluationResult.SKIP;
    }
    const outcomes = await Promise.all(
      this.subRules.map(async (subRule) =>
        normalizeRuleEvaluationOutcome(
          await subRule.evaluateAsync(viewerContext, queryContext, evaluationContext, entity),
        ),
      ),
    );
    return outcomes.every((outcome) => outcome.result === RuleEvaluationResult.ALLOW)
      ? RuleEvaluationResult.ALLOW
      : skipWithReasons(
          ...outcomes
            .filter((outcome) => outcome.result !== RuleEvaluationResult.ALLOW)
            .flatMap((outcome) => outcome.reasons),
        );
  }
}
