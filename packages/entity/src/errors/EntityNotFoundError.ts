import { IEntityClass } from '../Entity';
import { EntityPrivacyPolicy } from '../EntityPrivacyPolicy';
import { ReadonlyEntity } from '../ReadonlyEntity';
import { ViewerContext } from '../ViewerContext';
import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError';

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

/**
 * Error thrown when an entity is not found during certain load methods.
 */
export class EntityNotFoundError<
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
  static {
    this.prototype.name = 'EntityNotFoundError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_NOT_FOUND {
    return EntityErrorCode.ERR_ENTITY_NOT_FOUND;
  }

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
