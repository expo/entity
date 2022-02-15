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
          cacheAdapterProvider: LocalMemoryCacheAdapterProvider.getProvider(localMemoryOptions),
        },
      ],
    ])
  );
};
