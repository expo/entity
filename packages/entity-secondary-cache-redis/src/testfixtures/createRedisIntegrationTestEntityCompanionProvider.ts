import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  StubQueryContextProvider,
  StubDatabaseAdapterProvider,
} from '@expo/entity';
import {
  GenericRedisCacheContext,
  RedisCacheAdapterProvider,
} from '@expo/entity-cache-adapter-redis';

const queryContextProvider = new StubQueryContextProvider();

export const createRedisIntegrationTestEntityCompanionProvider = (
  genericRedisCacheContext: GenericRedisCacheContext,
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    new Map([
      [
        'postgres',
        {
          adapterProvider: new StubDatabaseAdapterProvider(),
          queryContextProvider,
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
