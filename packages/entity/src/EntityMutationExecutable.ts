import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * A trigger is a way to specify entity mutation operation side-effects that run within the
 * same transaction as the mutation itself. The one exception is afterCommit, which will run within
 * the transaction if a transaction is supplied.
 *
 * A validator is a way to specify entity mutation validation that run within the
 * same transaction as the mutation itself before creating or updating an entity.
 */
export default abstract class EntityMutationExecutable<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  abstract async executeAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<void>;
}
