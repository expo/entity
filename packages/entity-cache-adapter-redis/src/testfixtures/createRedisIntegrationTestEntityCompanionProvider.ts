import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
  StubDatabaseAdapter,
  StubQueryContextProvider,
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
        adapter: StubDatabaseAdapter,
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
