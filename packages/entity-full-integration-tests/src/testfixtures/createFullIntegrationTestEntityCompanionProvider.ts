import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
} from '@expo/entity';
import {
  RedisCacheAdapterContext,
  RedisCacheAdapterProvider,
} from '@expo/entity-cache-adapter-redis';
import {
  PostgresEntityDatabaseAdapterProvider,
  PostgresEntityQueryContextProvider,
} from '@expo/entity-database-adapter-knex';
import Knex from 'knex';

export const createFullIntegrationTestEntityCompanionProvider = (
  knex: Knex,
  redisCacheAdapterContext: RedisCacheAdapterContext,
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
        cacheAdapterProvider: new RedisCacheAdapterProvider(redisCacheAdapterContext),
      },
    }
  );
};
