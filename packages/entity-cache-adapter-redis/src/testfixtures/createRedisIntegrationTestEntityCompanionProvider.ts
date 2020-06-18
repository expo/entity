import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
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
    {
      [DatabaseAdapterFlavor.POSTGRES]: {
        adapterProvider: new StubDatabaseAdapterProvider(),
        queryContextProvider: StubQueryContextProvider,
      },
    },
    {
      [CacheAdapterFlavor.REDIS]: {
        cacheAdapterProvider: new RedisCacheAdapterProvider(redisCacheAdapterContext),
      },
    }
  );
};
