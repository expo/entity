import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  StubQueryContextProvider,
  StubDatabaseAdapterProvider,
} from '@expo/entity';

import { ShardedRedisCacheAdapterContext } from '../ShardedGenericRedisCacher';
import ShardedRedisCacheAdapterProvider from '../ShardedRedisCacheAdapterProvider';

export const createShardedRedisIntegrationTestEntityCompanionProvider = (
  shardedRedisCacheAdapterContext: ShardedRedisCacheAdapterContext,
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
          cacheAdapterProvider: new ShardedRedisCacheAdapterProvider(
            shardedRedisCacheAdapterContext
          ),
        },
      ],
    ])
  );
};
