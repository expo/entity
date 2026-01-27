import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import { ReadonlyEntity } from '../ReadonlyEntity';
import { ViewerContext } from '../ViewerContext';
import { PrivacyPolicyRule, RuleEvaluationResult } from './PrivacyPolicyRule';

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
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
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
