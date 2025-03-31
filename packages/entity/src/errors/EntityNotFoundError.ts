import EntityError, { EntityErrorCode, EntityErrorState } from './EntityError';
import { IEntityClass } from '../Entity';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';

export default class EntityNotFoundError<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  N extends keyof TFields,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_NOT_FOUND;

  constructor(
    entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    fieldName: N,
    fieldValue: TFields[N],
  ) {
    super(`Entity not found: ${entityClass.name} (${String(fieldName)} = ${fieldValue})`);
  }
}
