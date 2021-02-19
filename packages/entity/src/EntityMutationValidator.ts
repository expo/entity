import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * A validator is a way to specify entity mutation validation that runs within the
 * same transaction as the mutation itself before creating or updating an entity.
 */
export default abstract class EntityMutationValidator<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  abstract executeAsync(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<void>;
}
