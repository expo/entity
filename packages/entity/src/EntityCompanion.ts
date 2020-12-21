import { IEntityClass } from './Entity';
import EntityLoaderFactory from './EntityLoaderFactory';
import EntityMutationTriggerConfiguration from './EntityMutationTriggerConfiguration';
import EntityMutationValidator from './EntityMutationValidator';
import EntityMutatorFactory from './EntityMutatorFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import EntityQueryContextProvider from './EntityQueryContextProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityTableDataCoordinator from './internal/EntityTableDataCoordinator';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';

export interface IPrivacyPolicyClass<TPrivacyPolicy> {
  new (): TPrivacyPolicy;
}

/**
 * Composition root responsible for orchestrating setup of Entity mutators and loaders.
 */
export default class EntityCompanion<
  TFields,
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
  TSelectedFields extends keyof TFields
> {
  private readonly entityLoaderFactory: EntityLoaderFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;
  private readonly entityMutatorFactory: EntityMutatorFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;

  constructor(
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly tableDataCoordinator: EntityTableDataCoordinator<TFields>,
    PrivacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>,
    mutationValidators: EntityMutationValidator<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >[],
    mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    metricsAdapter: IEntityMetricsAdapter
  ) {
    const privacyPolicy = new PrivacyPolicyClass();
    this.entityLoaderFactory = new EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >(
      tableDataCoordinator.entityConfiguration.idField as keyof Pick<TFields, TSelectedFields>,
      entityClass,
      privacyPolicy,
      tableDataCoordinator.dataManager
    );
    this.entityMutatorFactory = new EntityMutatorFactory(
      tableDataCoordinator.entityConfiguration,
      entityClass,
      privacyPolicy,
      mutationValidators,
      mutationTriggers,
      this.entityLoaderFactory,
      tableDataCoordinator.databaseAdapter,
      metricsAdapter
    );
  }

  getLoaderFactory(): EntityLoaderFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityLoaderFactory;
  }

  getMutatorFactory(): EntityMutatorFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityMutatorFactory;
  }

  /**
   * Get the query context provider for this entity.
   */
  getQueryContextProvider(): EntityQueryContextProvider {
    return this.tableDataCoordinator.getQueryContextProvider();
  }
}
