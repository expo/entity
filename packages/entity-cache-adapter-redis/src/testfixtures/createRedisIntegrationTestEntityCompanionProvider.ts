import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  StubQueryContextProvider,
  StubDatabaseAdapterProvider,
} from '@expo/entity';

import { RedisCacheAdapterContext } from '../RedisCacheAdapter';
import RedisCacheAdapterProvider from '../RedisCacheAdapterProvider';

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
          adapterProvider: new StubDatabaseAdapterProvider(),
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
