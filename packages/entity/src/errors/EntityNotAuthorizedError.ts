import { EntityAuthorizationAction } from '../EntityPrivacyPolicy';
import { ReadonlyEntity } from '../ReadonlyEntity';
import { ViewerContext } from '../ViewerContext';
import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError';

/**
 * Error thrown when viewer context is not authorized to perform an action on an entity.
 */
export class EntityNotAuthorizedError<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityError {
  static {
    this.prototype.name = 'EntityNotAuthorizedError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_NOT_AUTHORIZED {
    return EntityErrorCode.ERR_ENTITY_NOT_AUTHORIZED;
  }

  public readonly entityClassName: string;

  constructor(
    entity: TEntity,
    viewerContext: TViewerContext,
    action: EntityAuthorizationAction,
    ruleIndex: number,
  ) {
    super(
      `Entity not authorized: ${entity} (viewer = ${viewerContext}, action = ${EntityAuthorizationAction[action]}, ruleIndex = ${ruleIndex})`,
    );
    this.entityClassName = entity.constructor.name;
  }
}
