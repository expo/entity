import {
  IEntityMetricsAdapter,
  NoOpEntityMetricsAdapter,
  EntityCompanionProvider,
} from '@expo/entity';
import { InMemoryFullCacheStubCacheAdapterProvider } from '@expo/entity-testing-utils';

import { InMemoryDatabaseAdapterProvider } from './adapters/InMemoryDatabaseAdapter';
import InMemoryQueryContextProvider from './adapters/InMemoryQueryContextProvider';

/**
 * The EntityCompanionProvider is the root of the Entity framework. The ViewerContext
 * for each request is instantiated with a reference to the EntityCompanionProvider,
 * and all subsequent CRUD operations make use of it through the ViewerContext.
 * One EntityCompanionProvider should be created per-request.
 */
export const createEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    new Map([
      [
        'postgres',
        // An in-memory DB is used for demonstration purposes, but generally this would be
        // instantiated with PostgresEntityDatabaseAdapter and PostgresEntityQueryContextProvider
        {
          adapterProvider: new InMemoryDatabaseAdapterProvider(),
          queryContextProvider: new InMemoryQueryContextProvider(),
        },
      ],
    ]),
    new Map([
      [
        'redis',
        // An in-memory cache is used for demonstration purposes, but generally this would be
        // instantiated with a RedisCacheAdapterProvider
        {
          cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
        },
      ],
    ]),
  );
};
