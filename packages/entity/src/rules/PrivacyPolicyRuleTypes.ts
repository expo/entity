import { RuleEvaluationResult, RuleEvaluationResultType } from './PrivacyPolicyRuleEnums';
import { PrivacyPolicyRuleInternal } from './internal/PrivacyPolicyRule';
import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';

export type PrivacyPolicyRule<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> =
  | AllowOrSkipPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>
  | DenyOrSkipPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>
  | SkipPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>;

export abstract class AllowOrSkipPrivacyPolicyRule<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends PrivacyPolicyRuleInternal<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  abstract override evaluateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext,
    entity: TEntity
  ): Promise<RuleEvaluationResult.ALLOW | RuleEvaluationResult.SKIP>;

  override resultType = RuleEvaluationResultType.ALLOW_OR_SKIP;
}

export abstract class DenyOrSkipPrivacyPolicyRule<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends PrivacyPolicyRuleInternal<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  abstract override evaluateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext,
    entity: TEntity
  ): Promise<RuleEvaluationResult.DENY | RuleEvaluationResult.SKIP>;

  override resultType = RuleEvaluationResultType.DENY_OR_SKIP;
}

export abstract class SkipPrivacyPolicyRule<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends PrivacyPolicyRuleInternal<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  abstract override evaluateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext,
    entity: TEntity
  ): Promise<RuleEvaluationResult.SKIP>;

  override resultType = RuleEvaluationResultType.SKIP;
}
