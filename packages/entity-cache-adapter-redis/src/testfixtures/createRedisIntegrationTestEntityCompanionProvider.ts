import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  StubQueryContextProvider,
  StubDatabaseAdapterProvider,
} from '@expo/entity';

import { RedisCacheAdapterContext } from '../RedisCacheAdapter';
import RedisCacheAdapterProvider from '../RedisCacheAdapterProvider';

// share across all in calls in test to simulate postgres
const adapterProvider = new StubDatabaseAdapterProvider();

export const createRedisIntegrationTestEntityCompanionProvider = (
  redisCacheAdapterContext: RedisCacheAdapterContext,
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    new Map([
      [
        'postgres',
        {
          adapterProvider,
          queryContextProvider: StubQueryContextProvider,
        },
      ],
    ]),
    new Map([
      [
        'redis',
        {
          cacheAdapterProvider: new RedisCacheAdapterProvider(redisCacheAdapterContext),
        },
      ],
    ])
  );
};
