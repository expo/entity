import { EntityValidatorMutationInfo } from './EntityMutationInfo';
import { EntityTransactionalQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * A validator is a way to specify entity mutation validation that runs within the
 * same transaction as the mutation itself before creating or updating an entity.
 */
export default abstract class EntityMutationValidator<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  abstract executeAsync(
    viewerContext: TViewerContext,
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityValidatorMutationInfo<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >
  ): Promise<void>;
}
