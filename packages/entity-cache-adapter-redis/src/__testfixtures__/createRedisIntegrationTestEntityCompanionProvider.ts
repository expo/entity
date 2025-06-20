import {
  EntityCompanionProvider,
  IEntityMetricsAdapter,
  NoOpEntityMetricsAdapter,
} from '@expo/entity';
import { StubDatabaseAdapterProvider, StubQueryContextProvider } from '@expo/entity-testing-utils';

import { GenericRedisCacheContext } from '../GenericRedisCacher';
import { RedisCacheAdapterProvider } from '../RedisCacheAdapterProvider';

// share across all in calls in test to simulate postgres
const adapterProvider = new StubDatabaseAdapterProvider();
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
          adapterProvider,
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
