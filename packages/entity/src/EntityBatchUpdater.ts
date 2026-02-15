import invariant from 'invariant';

import { AuthorizationResultBasedBatchUpdateMutator } from './AuthorizationResultBasedEntityMutator';
import { EnforcingEntityBatchUpdater } from './EnforcingEntityBatchUpdater';
import { IEntityClass } from './Entity';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * The primary interface for batch updating entities.
 */
export class EntityBatchUpdater<
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
   * Enforcing entity batch updater. All updates through this updater are
   * guaranteed to be successful and will throw otherwise.
   */
  enforcing(): EnforcingEntityBatchUpdater<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityBatchUpdater(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity batch updater. All updates through this
   * updater are results, where an unsuccessful result means an authorization
   * error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedBatchUpdateMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    invariant(this.existingEntities.length > 0, 'EntityBatchUpdater requires at least one entity');
    return this.existingEntities[0]!.getViewerContext()
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getMutatorFactory()
      .forBatchUpdate(this.existingEntities, this.queryContext);
  }
}
