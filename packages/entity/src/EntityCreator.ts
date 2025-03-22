import { AuthorizationResultBasedCreateMutator } from './AuthorizationResultBasedEntityMutator';
import EnforcingEntityCreator from './EnforcingEntityCreator';
import { IEntityClass } from './Entity';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * The primary interface for creating entities.
 */
export default class EntityCreator<
  TFields extends Record<string, any>,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TViewerContext2 extends TViewerContext,
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
    private readonly viewerContext: TViewerContext2,
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
   * Enforcing entity creator. All creates through this creator are
   * guaranteed to be successful and will throw otherwise.
   */
  enforcing(): EnforcingEntityCreator<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityCreator(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity creator. All creates through this
   * creator are results, where an unsuccessful result means an authorization
   * error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedCreateMutator<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.viewerContext
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getMutatorFactory()
      .forCreate(this.queryContext);
  }
}
