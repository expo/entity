import { IEntityClass } from './Entity';
import EntityCacheAdapter from './EntityCacheAdapter';
import EntityConfiguration from './EntityConfiguration';
import EntityDatabaseAdapter from './EntityDatabaseAdapter';
import EntityLoaderFactory from './EntityLoaderFactory';
import EntityMutatorFactory from './EntityMutatorFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import IEntityCacheAdapterProvider from './IEntityCacheAdapterProvider';
import IEntityDatabaseAdapterProvider from './IEntityDatabaseAdapterProvider';
import IEntityQueryContextProvider from './IEntityQueryContextProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityDataManager from './internal/EntityDataManager';
import ReadThroughEntityCache from './internal/ReadThroughEntityCache';
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
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  // defined as properties so that they can be accessed from tests
  private readonly databaseAdapter: EntityDatabaseAdapter<TFields>;
  private readonly cacheAdapter: EntityCacheAdapter<TFields>;

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
    entityConfiguration: EntityConfiguration<TFields>,
    databaseAdapterProvider: IEntityDatabaseAdapterProvider,
    cacheAdapterProvider: IEntityCacheAdapterProvider,
    PrivacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>,
    private readonly queryContextProvider: IEntityQueryContextProvider,

    metricsAdapter: IEntityMetricsAdapter
  ) {
    this.databaseAdapter = databaseAdapterProvider.getDatabaseAdapter(entityConfiguration);
    this.cacheAdapter = cacheAdapterProvider.getCacheAdapter(entityConfiguration);
    const dataManager = new EntityDataManager(
      this.databaseAdapter,
      new ReadThroughEntityCache(entityConfiguration, this.cacheAdapter),
      queryContextProvider,
      metricsAdapter
    );
    const privacyPolicy = new PrivacyPolicyClass();
    this.entityLoaderFactory = new EntityLoaderFactory(
      entityConfiguration,
      entityClass,
      privacyPolicy,
      dataManager
    );
    this.entityMutatorFactory = new EntityMutatorFactory(
      entityConfiguration,
      entityClass,
      privacyPolicy,
      this.entityLoaderFactory,
      this.databaseAdapter,
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

  getQueryContextProvider(): IEntityQueryContextProvider {
    return this.queryContextProvider;
  }
}
