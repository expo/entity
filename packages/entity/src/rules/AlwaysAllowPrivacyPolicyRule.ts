import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';
import PrivacyPolicyRule, { RuleEvaluationResult } from './PrivacyPolicyRule';

/**
 * Privacy policy rule that always allows.
 */
export default class AlwaysAllowPrivacyPolicyRule<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TDatabaseFields extends TFields = TFields
> extends PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TDatabaseFields> {
  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    _entity: TEntity
  ): Promise<RuleEvaluationResult> {
    return RuleEvaluationResult.ALLOW;
  }
}
