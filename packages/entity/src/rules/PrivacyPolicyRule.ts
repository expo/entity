import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';

export enum RuleEvaluationResult {
  DENY = -1,
  SKIP = 0,
  ALLOW = 1,
}

export default abstract class PrivacyPolicyRule<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>
> {
  abstract async evaluateAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<RuleEvaluationResult>;
}
