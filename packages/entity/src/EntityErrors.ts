import ES6Error from 'es6-error';

import { IEntityClass } from './Entity';
import EntityPrivacyPolicy, { EntityAuthorizationAction } from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

export abstract class EntityError extends ES6Error {}

export class EntityNotFoundError<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TDatabaseFields
  >,
  N extends keyof TDatabaseFields,
  TDatabaseFields extends TFields = TFields
> extends EntityError {
  constructor(
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TDatabaseFields
    >,
    fieldName: N,
    fieldValue: TDatabaseFields[N]
  ) {
    super(`Entity not found: ${entityClass.name} (${fieldName} = ${fieldValue})`);
  }
}

export class EntityNotAuthorizedError<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TDatabaseFields extends TFields = TFields
> extends EntityError {
  public readonly entityClassName: string;

  constructor(
    entity: TEntity,
    viewerContext: TViewerContext,
    action: EntityAuthorizationAction,
    ruleIndex: number
  ) {
    super(
      `Entity not authorized: ${entity} (viewer = ${viewerContext}, action = ${EntityAuthorizationAction[action]}, ruleIndex = ${ruleIndex})`
    );
    this.entityClassName = entity.constructor.name;
  }
}
