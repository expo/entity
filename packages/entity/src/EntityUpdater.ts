import { AuthorizationResultBasedUpdateMutator } from './AuthorizationResultBasedEntityMutator';
import { EnforcingEntityUpdater } from './EnforcingEntityUpdater';
import { IEntityClass } from './Entity';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * The primary interface for updating entities.
 */
export class EntityUpdater<
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
   * Enforcing entity updater. All updates through this updater are
   * guaranteed to be successful and will throw otherwise.
   */
  enforcing(): EnforcingEntityUpdater<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityUpdater(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity updater. All updates through this
   * updater are results, where an unsuccessful result means an authorization
   * error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedUpdateMutator<
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
      .forUpdate(this.existingEntity, this.queryContext, /* cascadingDeleteCause */ null);
  }
}
