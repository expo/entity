import type { IEntityMetricsAdapter } from '@expo/entity';
import { EntityCompanionProvider, NoOpEntityMetricsAdapter } from '@expo/entity';
import { InMemoryFullCacheStubCacheAdapterProvider } from '@expo/entity-testing-utils';
import type { Knex } from 'knex';

import { PostgresEntityDatabaseAdapterProvider } from '../PostgresEntityDatabaseAdapterProvider';
import { PostgresEntityQueryContextProvider } from '../PostgresEntityQueryContextProvider';

export const createKnexIntegrationTestEntityCompanionProvider = (
  knex: Knex,
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
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
    ]),
  );
};
