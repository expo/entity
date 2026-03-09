import type { IEntityMetricsAdapter } from '@expo/entity';
import { NoOpEntityMetricsAdapter, EntityCompanionProvider } from '@expo/entity';
import type { GenericRedisCacheContext } from '@expo/entity-cache-adapter-redis';
import { RedisCacheAdapterProvider } from '@expo/entity-cache-adapter-redis';
import {
  PostgresEntityDatabaseAdapterProvider,
  PostgresEntityQueryContextProvider,
} from '@expo/entity-database-adapter-knex';
import type { Knex } from 'knex';

export const createFullIntegrationTestEntityCompanionProvider = (
  knex: Knex,
  genericRedisCacheContext: GenericRedisCacheContext,
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
          cacheAdapterProvider: new RedisCacheAdapterProvider(genericRedisCacheContext),
        },
      ],
    ]),
  );
};
