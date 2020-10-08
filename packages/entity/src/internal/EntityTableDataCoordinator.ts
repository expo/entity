import EntityCacheAdapter from '../EntityCacheAdapter';
import EntityConfiguration from '../EntityConfiguration';
import EntityDatabaseAdapter from '../EntityDatabaseAdapter';
import EntityQueryContextProvider from '../EntityQueryContextProvider';
import IEntityCacheAdapterProvider from '../IEntityCacheAdapterProvider';
import IEntityDatabaseAdapterProvider from '../IEntityDatabaseAdapterProvider';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import EntityDataManager from './EntityDataManager';
import ReadThroughEntityCache from './ReadThroughEntityCache';

/**
 * Responsible for orchestrating fetching and caching of entity data from a
 * table. Note that one instance is shared amongst all entities that read from
 * the table to ensure cross-entity data consistency.
 */
export default class EntityTableDataCoordinator<TFields> {
  readonly databaseAdapter: EntityDatabaseAdapter<TFields>;
  readonly cacheAdapter: EntityCacheAdapter<TFields>;
  readonly dataManager: EntityDataManager<TFields>;

  constructor(
    readonly entityConfiguration: EntityConfiguration<TFields>,
    databaseAdapterProvider: IEntityDatabaseAdapterProvider,
    cacheAdapterProvider: IEntityCacheAdapterProvider,
    private readonly queryContextProvider: EntityQueryContextProvider,
    metricsAdapter: IEntityMetricsAdapter,
    entityClassName: string
  ) {
    this.databaseAdapter = databaseAdapterProvider.getDatabaseAdapter(entityConfiguration);
    this.cacheAdapter = cacheAdapterProvider.getCacheAdapter(entityConfiguration);
    this.dataManager = new EntityDataManager(
      this.databaseAdapter,
      new ReadThroughEntityCache(entityConfiguration, this.cacheAdapter),
      queryContextProvider,
      metricsAdapter,
      entityClassName
    );
  }

  getQueryContextProvider(): EntityQueryContextProvider {
    return this.queryContextProvider;
  }
}
