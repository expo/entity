import {
  EntityCompanionProvider,
  IEntityMetricsAdapter,
  NoOpEntityMetricsAdapter,
} from '@expo/entity';
import { StubDatabaseAdapterProvider, StubQueryContextProvider } from '@expo/entity-testing-utils';

import { LocalMemoryCacheAdapterProvider } from '../LocalMemoryCacheAdapterProvider';

const queryContextProvider = new StubQueryContextProvider();

export const createLocalMemoryTestEntityCompanionProvider = (
  localMemoryOptions: { maxSize?: number; ttlSeconds?: number } = {},
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
  const localMemoryCacheAdapterProvider =
    localMemoryOptions.maxSize === 0 && localMemoryOptions.ttlSeconds === 0
      ? LocalMemoryCacheAdapterProvider.createNoOpProvider()
      : LocalMemoryCacheAdapterProvider.createProviderWithOptions(localMemoryOptions);
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
        'local-memory',
        {
          cacheAdapterProvider: localMemoryCacheAdapterProvider,
        },
      ],
    ]),
  );
};

export const createNoOpLocalMemoryIntegrationTestEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
  return createLocalMemoryTestEntityCompanionProvider(
    { maxSize: 0, ttlSeconds: 0 },
    metricsAdapter,
  );
};
