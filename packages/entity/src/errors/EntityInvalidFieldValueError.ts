import type { IEntityClass } from '../Entity.ts';
import type { EntityPrivacyPolicy } from '../EntityPrivacyPolicy.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError.ts';

/**
 * Error thrown when an entity field has an invalid value, either during load or mutation.
 */
export class EntityInvalidFieldValueError<
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
    this.prototype.name = 'EntityInvalidFieldValueError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_INVALID_FIELD_VALUE {
    return EntityErrorCode.ERR_ENTITY_INVALID_FIELD_VALUE;
  }

  readonly fieldName: N;
  readonly fieldValue: TFields[N] | undefined;

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
    fieldValue?: TFields[N],
  ) {
    super(`Entity field not valid: ${entityClass.name} (${String(fieldName)} = ${fieldValue})`);
    this.fieldName = fieldName;
    this.fieldValue = fieldValue;
  }
}
