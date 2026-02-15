import invariant from 'invariant';

import { AuthorizationResultBasedBatchDeleteMutator } from './AuthorizationResultBasedEntityMutator';
import { EnforcingEntityBatchDeleter } from './EnforcingEntityBatchDeleter';
import { IEntityClass } from './Entity';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * The primary interface for batch deleting entities.
 */
export class EntityBatchDeleter<
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
    private readonly existingEntities: readonly TEntity[],
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
   * Enforcing entity batch deleter. All deletes through this deleter are
   * guaranteed to be successful and will throw otherwise.
   */
  enforcing(): EnforcingEntityBatchDeleter<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityBatchDeleter(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity batch deleter. All deletes through this
   * deleter are results, where an unsuccessful result means an authorization
   * error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedBatchDeleteMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    invariant(this.existingEntities.length > 0, 'EntityBatchDeleter requires at least one entity');
    return this.existingEntities[0]!.getViewerContext()
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getMutatorFactory()
      .forBatchDelete(this.existingEntities, this.queryContext);
  }
}
