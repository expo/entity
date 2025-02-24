import { AuthorizationResultBasedUpdateMutator } from './AuthorizationResultBasedEntityMutator';
import EnforcingEntityUpdater from './EnforcingEntityUpdater';
import { IEntityClass } from './Entity';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * The primary interface for updating entities.
 */
export default class EntityUpdater<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
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
      TID,
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
    TID,
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
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getMutatorFactory()
      .forUpdate(this.existingEntity, this.queryContext);
  }
}
