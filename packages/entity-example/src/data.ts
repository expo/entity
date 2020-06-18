import {
  IEntityMetricsAdapter,
  NoOpEntityMetricsAdapter,
  EntityCompanionProvider,
  InMemoryFullCacheStubCacheAdapterProvider,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
} from '@expo/entity';

import { InMemoryDatabaseAdapterProvider } from './adapters/InMemoryDatabaseAdapter';
import InMemoryQueryContextProvider from './adapters/InMemoryQueryContextProvider';

/**
 * The EntityCompanionProvider is the root of the Entity framework. The ViewerContext
 * for each request is instantiated with a reference to the EntityCompanionProvider,
 * and all subsequent CRUD operations make use of it through the ViewerContext.
 * One EntityCompanionProvider should be created per-request.
 */
export const createEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    {
      // An in-memory DB is used for demonstration purposes, but generally this would be
      // instantiated with PostgresEntityDatabaseAdapter and PostgresEntityQueryContextProvider
      [DatabaseAdapterFlavor.POSTGRES]: {
        adapterProvider: new InMemoryDatabaseAdapterProvider(),
        queryContextProvider: new InMemoryQueryContextProvider(),
      },
    },
    {
      // An in-memory cache is used for demonstration purposes, but generally this would be
      // instantiated with a RedisCacheAdapterProvider
      [CacheAdapterFlavor.REDIS]: {
        cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
      },
    }
  );
};
