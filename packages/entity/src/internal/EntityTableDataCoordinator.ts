import type { EntityConfiguration } from '../EntityConfiguration.ts';
import type { EntityDatabaseAdapter } from '../EntityDatabaseAdapter.ts';
import type { EntityQueryContextProvider } from '../EntityQueryContextProvider.ts';
import type { IEntityCacheAdapter } from '../IEntityCacheAdapter.ts';
import type { IEntityCacheAdapterProvider } from '../IEntityCacheAdapterProvider.ts';
import type { IEntityDatabaseAdapterProvider } from '../IEntityDatabaseAdapterProvider.ts';
import type { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter.ts';
import { EntityDataManager } from './EntityDataManager.ts';
import { EntityMutationDataManager } from './EntityMutationDataManager.ts';
import { ReadThroughEntityCache } from './ReadThroughEntityCache.ts';

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
  readonly mutationDataManager: EntityMutationDataManager<TFields, TIDField>;

  constructor(
    readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    databaseAdapterProvider: IEntityDatabaseAdapterProvider,
    cacheAdapterProvider: IEntityCacheAdapterProvider,
    private readonly queryContextProvider: EntityQueryContextProvider,
    public readonly metricsAdapter: IEntityMetricsAdapter,
    public readonly entityClassName: string,
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
    this.mutationDataManager = new EntityMutationDataManager(
      this.databaseAdapter,
      metricsAdapter,
      entityClassName,
    );
  }

  getQueryContextProvider(): EntityQueryContextProvider {
    return this.queryContextProvider;
  }
}
