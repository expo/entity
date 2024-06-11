import AuthorizationResultBasedEntityLoader from './AuthorizationResultBasedEntityLoader';
import EnforcingEntityLoader from './EnforcingEntityLoader';
import { IEntityClass } from './Entity';
import EntityConfiguration from './EntityConfiguration';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityDataManager from './internal/EntityDataManager';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';

/**
 * The primary interface for loading entities. All normal loads are batched,
 * cached, and authorized against the entity's EntityPrivacyPolicy.
 */
export default class EntityLoader<
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
    private readonly viewerContext: TViewerContext,
    private readonly queryContext: EntityQueryContext,
    private readonly privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly entitySelectedFields: TSelectedFields[] | undefined,
    private readonly privacyPolicy: TPrivacyPolicy,
    private readonly dataManager: EntityDataManager<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  /**
   * Enforcing entity loader. All loads through this loader are
   * guaranteed to be the values of successful results (or null for some loader methods),
   * and will throw otherwise.
   */
  enforcing(): EnforcingEntityLoader<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityLoader(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity loader. All loads through this
   * loader are are results (or null for some loader methods), where an unsuccessful result
   * means an authorization error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedEntityLoader<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedEntityLoader(
      this.viewerContext,
      this.queryContext,
      this.privacyPolicyEvaluationContext,
      this.entityConfiguration,
      this.entityClass,
      this.entitySelectedFields,
      this.privacyPolicy,
      this.dataManager,
      this.metricsAdapter,
    );
  }
}
