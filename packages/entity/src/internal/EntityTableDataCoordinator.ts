import EntityCacheAdapter from '../EntityCacheAdapter';
import EntityConfiguration from '../EntityConfiguration';
import EntityDatabaseAdapter from '../EntityDatabaseAdapter';
import IEntityCacheAdapterProvider from '../IEntityCacheAdapterProvider';
import IEntityDatabaseAdapterProvider from '../IEntityDatabaseAdapterProvider';
import IEntityQueryContextProvider from '../IEntityQueryContextProvider';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import EntityDataManager from './EntityDataManager';
import ReadThroughEntityCache from './ReadThroughEntityCache';

/**
 * Responsible for orchestrating fetching and caching of entity data from a
 * table. Note that one instance is shared amongst all entities that read from
 * the table to ensure cross-entity data consistency.
 */
export default class EntityTableDataCoordinator<TDatabaseFields> {
  readonly databaseAdapter: EntityDatabaseAdapter<TDatabaseFields>;
  readonly cacheAdapter: EntityCacheAdapter<TDatabaseFields>;
  readonly dataManager: EntityDataManager<TDatabaseFields>;

  constructor(
    readonly entityConfiguration: EntityConfiguration<TDatabaseFields>,
    databaseAdapterProvider: IEntityDatabaseAdapterProvider,
    cacheAdapterProvider: IEntityCacheAdapterProvider,
    private readonly queryContextProvider: IEntityQueryContextProvider,
    metricsAdapter: IEntityMetricsAdapter
  ) {
    this.databaseAdapter = databaseAdapterProvider.getDatabaseAdapter(entityConfiguration);
    this.cacheAdapter = cacheAdapterProvider.getCacheAdapter(entityConfiguration);
    this.dataManager = new EntityDataManager(
      this.databaseAdapter,
      new ReadThroughEntityCache(entityConfiguration, this.cacheAdapter),
      queryContextProvider,
      metricsAdapter
    );
  }

  getQueryContextProvider(): IEntityQueryContextProvider {
    return this.queryContextProvider;
  }
}
