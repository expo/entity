import { IEntityClass } from '../Entity';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';
import EntityError, { EntityErrorState } from './EntityError';

export default class EntityNotFoundError<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  N extends keyof TFields,
  TSelectedFields extends keyof TFields = keyof TFields
> extends EntityError {
  public readonly state = EntityErrorState.PERMANENT;

  constructor(
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    fieldName: N,
    fieldValue: TFields[N]
  ) {
    super(`Entity not found: ${entityClass.name} (${fieldName} = ${fieldValue})`);
  }
}
