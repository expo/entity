import { AuthorizationResultBasedBatchCreateMutator } from './AuthorizationResultBasedEntityMutator';
import { EnforcingEntityBatchCreator } from './EnforcingEntityBatchCreator';
import { IEntityClass } from './Entity';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * The primary interface for batch creating entities.
 */
export class EntityBatchCreator<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TViewerContext2 extends TViewerContext,
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
    private readonly viewerContext: TViewerContext2,
    private readonly queryContext: EntityQueryContext,
    private readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly fieldObjects: readonly Readonly<Partial<TFields>>[],
  ) {}

  /**
   * Enforcing entity batch creator. All creates through this creator are
   * guaranteed to be successful and will throw otherwise.
   */
  enforcing(): EnforcingEntityBatchCreator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityBatchCreator(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity batch creator. All creates through this
   * creator are results, where an unsuccessful result means an authorization
   * error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedBatchCreateMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.viewerContext
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getMutatorFactory()
      .forBatchCreate(this.queryContext, this.fieldObjects);
  }
}
