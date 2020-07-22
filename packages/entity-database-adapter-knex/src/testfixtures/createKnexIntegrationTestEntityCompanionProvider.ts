import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
  InMemoryFullCacheStubCacheAdapterProvider,
} from '@expo/entity';
import Knex from 'knex';

import PostgresEntityDatabaseAdapterProvider from '../PostgresEntityDatabaseAdapterProvider';
import PostgresEntityQueryContextProvider from '../PostgresEntityQueryContextProvider';

export const createKnexIntegrationTestEntityCompanionProvider = (
  knex: Knex,
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    {
      [DatabaseAdapterFlavor.POSTGRES]: {
        adapterProvider: new PostgresEntityDatabaseAdapterProvider(),
        queryContextProvider: new PostgresEntityQueryContextProvider(knex),
      },
    },
    {
      [CacheAdapterFlavor.REDIS]: {
        cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
      },
    }
  );
};
