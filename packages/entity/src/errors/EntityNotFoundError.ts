import EntityError, { EntityErrorCode, EntityErrorState } from './EntityError';
import { IEntityClass } from '../Entity';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';

type EntityNotFoundOptions<
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
> = {
  entityClass: IEntityClass<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;
  fieldName: N;
  fieldValue: TFields[N];
};

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

  constructor(message: string);
  constructor(
    options: EntityNotFoundOptions<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      N,
      TSelectedFields
    >,
  );

  constructor(
    messageOrOptions:
      | string
      | EntityNotFoundOptions<
          TFields,
          TIDField,
          TViewerContext,
          TEntity,
          TPrivacyPolicy,
          N,
          TSelectedFields
        >,
  ) {
    if (typeof messageOrOptions === 'string') {
      super(messageOrOptions);
    } else {
      super(
        `Entity not found: ${messageOrOptions.entityClass.name} (${String(messageOrOptions.fieldName)} = ${messageOrOptions.fieldValue})`,
      );
    }
  }
}
