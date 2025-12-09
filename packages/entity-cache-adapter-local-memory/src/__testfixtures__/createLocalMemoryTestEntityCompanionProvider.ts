import {
  EntityCompanionProvider,
  IEntityMetricsAdapter,
  NoOpEntityMetricsAdapter,
} from '@expo/entity';
import { StubDatabaseAdapterProvider, StubQueryContextProvider } from '@expo/entity-testing-utils';
import { TTLCache } from '@isaacs/ttlcache';

import { ILocalMemoryCache, LocalMemoryCacheValue } from '../GenericLocalMemoryCacher';
import { LocalMemoryCacheAdapterProvider } from '../LocalMemoryCacheAdapterProvider';

const queryContextProvider = new StubQueryContextProvider();

function createTTLCache<TFields extends Record<string, any>>(
  options: { maxSize?: number; ttlSeconds?: number } = {},
): ILocalMemoryCache<TFields> {
  const DEFAULT_LRU_CACHE_MAX_AGE_SECONDS = 10;
  const DEFAULT_LRU_CACHE_SIZE = 10000;
  const maxAgeSeconds = options.ttlSeconds ?? DEFAULT_LRU_CACHE_MAX_AGE_SECONDS;
  return new TTLCache<string, LocalMemoryCacheValue<TFields>>({
    max: options.maxSize ?? DEFAULT_LRU_CACHE_SIZE,
    ttl: maxAgeSeconds * 1000, // convert to ms
    updateAgeOnGet: true,
  });
}

export const createLocalMemoryTestEntityCompanionProvider = (
  localMemoryOptions: { maxSize?: number; ttlSeconds?: number } = {},
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
  const localMemoryCacheAdapterProvider =
    localMemoryOptions.maxSize === 0 && localMemoryOptions.ttlSeconds === 0
      ? LocalMemoryCacheAdapterProvider.createNoOpProvider()
      : LocalMemoryCacheAdapterProvider.createProviderWithCacheCreator(() =>
          createTTLCache(localMemoryOptions),
        );
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
