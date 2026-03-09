import type { AuthorizationResultBasedDeleteMutator } from './AuthorizationResultBasedEntityMutator.ts';
import { EnforcingEntityDeleter } from './EnforcingEntityDeleter.ts';
import type { IEntityClass } from './Entity.ts';
import type { EntityPrivacyPolicy } from './EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from './EntityQueryContext.ts';
import type { ReadonlyEntity } from './ReadonlyEntity.ts';
import type { ViewerContext } from './ViewerContext.ts';

/**
 * The primary interface for deleting entities.
 */
export class EntityDeleter<
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
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly existingEntity: TEntity,
    private readonly queryContext: EntityQueryContext,
    private readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Enforcing entity deleter. All deletes through this deleter are
   * guaranteed to be successful and will throw otherwise.
   */
  enforcing(): EnforcingEntityDeleter<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityDeleter(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity deleter. All deletes through this
   * deleter are results, where an unsuccessful result means an authorization
   * error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedDeleteMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getMutatorFactory()
      .forDelete(this.existingEntity, this.queryContext, /* cascadingDeleteCause */ null);
  }
}
