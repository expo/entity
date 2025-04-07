import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
} from '@expo/entity';
import {
  GenericRedisCacheContext,
  RedisCacheAdapterProvider,
} from '@expo/entity-cache-adapter-redis';
import {
  PostgresEntityDatabaseAdapterProvider,
  PostgresEntityQueryContextProvider,
} from '@expo/entity-database-adapter-knex';
import { Knex } from 'knex';

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
