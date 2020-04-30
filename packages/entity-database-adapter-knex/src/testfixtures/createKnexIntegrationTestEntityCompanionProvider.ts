import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
  NoCacheStubCacheAdapterProvider,
} from '@expo/entity';
import Knex from 'knex';

import PostgresEntityDatabaseAdapter from '../PostgresEntityDatabaseAdapter';
import PostgresEntityQueryContextProvider from '../PostgresEntityQueryContextProvider';

export const createKnexIntegrationTestEntityCompanionProvider = (
  knex: Knex,
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    {
      [DatabaseAdapterFlavor.POSTGRES]: {
        adapter: PostgresEntityDatabaseAdapter,
        queryContextProvider: new PostgresEntityQueryContextProvider(knex),
      },
    },
    {
      [CacheAdapterFlavor.REDIS]: {
        cacheAdapterProvider: new NoCacheStubCacheAdapterProvider(),
      },
    }
  );
};
