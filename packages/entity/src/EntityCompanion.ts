import { IEntityClass } from './Entity';
import EntityCacheAdapter from './EntityCacheAdapter';
import EntityConfiguration from './EntityConfiguration';
import EntityDatabaseAdapter from './EntityDatabaseAdapter';
import EntityLoaderFactory from './EntityLoaderFactory';
import EntityMutatorFactory from './EntityMutatorFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import IEntityCacheAdapterProvider from './IEntityCacheAdapterProvider';
import IEntityQueryContextProvider from './IEntityQueryContextProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityDataManager from './internal/EntityDataManager';
import ReadThroughEntityCache from './internal/ReadThroughEntityCache';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';

export interface IDatabaseAdapterClass<TFields> {
  new (entityConfiguration: EntityConfiguration<TFields>): EntityDatabaseAdapter<TFields>;
}

export interface IPrivacyPolicyClass<TPrivacyPolicy> {
  new (): TPrivacyPolicy;
}

/**
 * Helper class for orchestrating setup of Entity mutators and loaders. Single instance
 * created per request per entity type.
 */
export default class EntityCompanion<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>,
  TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
> {
  // defined as properties so that they can be accessed from tests
  private readonly databaseAdapter: EntityDatabaseAdapter<TFields>;
  private readonly cacheAdapter: EntityCacheAdapter<TFields>;

  private readonly entityLoaderFactory: EntityLoaderFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy
  >;
  private readonly entityMutatorFactory: EntityMutatorFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy
  >;

  constructor(
    entityClass: IEntityClass<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy>,
    entityConfiguration: EntityConfiguration<TFields>,
    DatabaseAdapterClass: IDatabaseAdapterClass<TFields>,
    cacheAdapterProvider: IEntityCacheAdapterProvider,
    PrivacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>,
    private readonly queryContextProvider: IEntityQueryContextProvider,

    metricsAdapter: IEntityMetricsAdapter
  ) {
    this.databaseAdapter = new DatabaseAdapterClass(entityConfiguration);
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

  getLoaderFactory(): EntityLoaderFactory<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return this.entityLoaderFactory;
  }

  getMutatorFactory(): EntityMutatorFactory<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return this.entityMutatorFactory;
  }

  getQueryContextProvider(): IEntityQueryContextProvider {
    return this.queryContextProvider;
  }
}
