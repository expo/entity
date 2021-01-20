import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
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
    new Map([
      [
        'postgres',
        {
          adapterProvider: new PostgresEntityDatabaseAdapterProvider(),
          queryContextProvider: new PostgresEntityQueryContextProvider(knex),
        },
      ],
    ]),
    new Map([
      [
        'redis',
        {
          cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
        },
      ],
    ])
  );
};
