import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';
import PrivacyPolicyRule, { RuleEvaluationResult } from './PrivacyPolicyRule';

export default class AlwaysAllowPrivacyPolicyRule<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>
> extends PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity> {
  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    _entity: TEntity
  ): Promise<RuleEvaluationResult> {
    return RuleEvaluationResult.ALLOW;
  }
}
