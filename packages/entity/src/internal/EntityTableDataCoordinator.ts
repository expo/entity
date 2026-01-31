import { EntityConfiguration } from '../EntityConfiguration';
import { EntityDatabaseAdapter } from '../EntityDatabaseAdapter';
import { EntityQueryContextProvider } from '../EntityQueryContextProvider';
import { IEntityCacheAdapter } from '../IEntityCacheAdapter';
import { IEntityCacheAdapterProvider } from '../IEntityCacheAdapterProvider';
import { IEntityDatabaseAdapterProvider } from '../IEntityDatabaseAdapterProvider';
import { EntityDataManager } from './EntityDataManager';
import { EntityKnexDataManager } from './EntityKnexDataManager';
import { ReadThroughEntityCache } from './ReadThroughEntityCache';
import { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter';

/**
 * Responsible for orchestrating fetching and caching of entity data from a
 * table. Note that one instance is shared amongst all entities that read from
 * the table to ensure cross-entity data consistency.
 *
 * @internal
 */
export class EntityTableDataCoordinator<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  readonly databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>;
  readonly cacheAdapter: IEntityCacheAdapter<TFields, TIDField>;
  readonly dataManager: EntityDataManager<TFields, TIDField>;
  readonly knexDataManager: EntityKnexDataManager<TFields, TIDField>;

  constructor(
    readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    databaseAdapterProvider: IEntityDatabaseAdapterProvider,
    cacheAdapterProvider: IEntityCacheAdapterProvider,
    private readonly queryContextProvider: EntityQueryContextProvider,
    metricsAdapter: IEntityMetricsAdapter,
    entityClassName: string,
  ) {
    this.databaseAdapter = databaseAdapterProvider.getDatabaseAdapter(entityConfiguration);
    this.cacheAdapter = cacheAdapterProvider.getCacheAdapter(entityConfiguration);
    this.dataManager = new EntityDataManager(
      this.databaseAdapter,
      new ReadThroughEntityCache(entityConfiguration, this.cacheAdapter),
      queryContextProvider,
      metricsAdapter,
      entityClassName,
    );
    this.knexDataManager = new EntityKnexDataManager(
      this.databaseAdapter,
      metricsAdapter,
      entityClassName,
    );
  }

  getQueryContextProvider(): EntityQueryContextProvider {
    return this.queryContextProvider;
  }
}
