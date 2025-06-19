import { AuthorizationResultBasedEntityAssociationLoader } from './AuthorizationResultBasedEntityAssociationLoader';
import { EnforcingEntityAssociationLoader } from './EnforcingEntityAssociationLoader';
import { IEntityClass } from './Entity';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * An association loader is a set of convenience methods for loading entities
 * associated with an entity. In relational databases, these entities are often referenced
 * by foreign keys.
 */
export class EntityAssociationLoader<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly entity: TEntity,
    private readonly queryContext: EntityQueryContext = entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(
        entity.constructor as IEntityClass<
          TFields,
          TIDField,
          TViewerContext,
          TEntity,
          any,
          TSelectedFields
        >,
      )
      .getQueryContextProvider()
      .getQueryContext(),
  ) {}

  /**
   * Enforcing entity association loader. All loads through this loader are
   * guaranteed to be the values of successful results (or null for some loader methods),
   * and will throw otherwise.
   */
  enforcing(): EnforcingEntityAssociationLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  > {
    return new EnforcingEntityAssociationLoader(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity loader. All loads through this
   * loader are results, where an unsuccessful result
   * means an authorization error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedEntityAssociationLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  > {
    return new AuthorizationResultBasedEntityAssociationLoader(this.entity, this.queryContext);
  }
}
