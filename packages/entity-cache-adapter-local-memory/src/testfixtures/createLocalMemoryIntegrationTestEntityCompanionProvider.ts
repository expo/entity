import {
  NoOpEntityMetricsAdapter,
  IEntityMetricsAdapter,
  EntityCompanionProvider,
  StubQueryContextProvider,
  StubDatabaseAdapterProvider,
} from '@expo/entity';

import { LocalMemoryCacheAdapterProvider } from '../LocalMemoryCacheAdapterProvider';

export const createLocalMemoryIntegrationTestEntityCompanionProvider = (
  localMemoryOptions: { maxSize?: number; ttlSeconds?: number } = {},
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  const localMemoryCacheAdapterProvider =
    localMemoryOptions.maxSize === 0 && localMemoryOptions.ttlSeconds === 0
      ? LocalMemoryCacheAdapterProvider.getNoOpProvider()
      : LocalMemoryCacheAdapterProvider.getProvider(localMemoryOptions);
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
        'local-memory',
        {
          cacheAdapterProvider: localMemoryCacheAdapterProvider,
        },
      ],
    ])
  );
};

export const createNoopLocalMemoryIntegrationTestEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return createLocalMemoryIntegrationTestEntityCompanionProvider(
    { maxSize: 0, ttlSeconds: 0 },
    metricsAdapter
  );
};
