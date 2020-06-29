import { IEntityClass } from './Entity';
import EntityLoaderFactory from './EntityLoaderFactory';
import EntityMutatorFactory from './EntityMutatorFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import IEntityQueryContextProvider from './IEntityQueryContextProvider';
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
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TDatabaseFields
  >,
  TDatabaseFields extends TFields = TFields
> {
  private readonly entityLoaderFactory: EntityLoaderFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TDatabaseFields
  >;
  private readonly entityMutatorFactory: EntityMutatorFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TDatabaseFields
  >;

  constructor(
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TDatabaseFields
    >,
    private readonly tableDataCoordinator: EntityTableDataCoordinator<TDatabaseFields>,
    PrivacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>,
    metricsAdapter: IEntityMetricsAdapter
  ) {
    const privacyPolicy = new PrivacyPolicyClass();
    this.entityLoaderFactory = new EntityLoaderFactory(
      tableDataCoordinator.entityConfiguration.idField,
      entityClass,
      privacyPolicy,
      tableDataCoordinator.dataManager
    );
    this.entityMutatorFactory = new EntityMutatorFactory(
      tableDataCoordinator.entityConfiguration.idField,
      entityClass,
      privacyPolicy,
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
    TDatabaseFields
  > {
    return this.entityLoaderFactory;
  }

  getMutatorFactory(): EntityMutatorFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TDatabaseFields
  > {
    return this.entityMutatorFactory;
  }

  /**
   * Get the query context provider for this entity.
   */
  getQueryContextProvider(): IEntityQueryContextProvider {
    return this.tableDataCoordinator.getQueryContextProvider();
  }
}
