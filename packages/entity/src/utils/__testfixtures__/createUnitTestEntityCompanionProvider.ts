import { EntityCompanionProvider } from '../../EntityCompanionProvider.ts';
import type { IEntityMetricsAdapter } from '../../metrics/IEntityMetricsAdapter.ts';
import { NoOpEntityMetricsAdapter } from '../../metrics/NoOpEntityMetricsAdapter.ts';
import { InMemoryFullCacheStubCacheAdapterProvider } from './StubCacheAdapter.ts';
import { StubDatabaseAdapterProvider } from './StubDatabaseAdapterProvider.ts';
import { StubQueryContextProvider } from './StubQueryContextProvider.ts';

const queryContextProvider = new StubQueryContextProvider();

/**
 * Entity companion provider for use in unit tests. All database and cache implementations
 * are replaced with in-memory simulations.
 */
export const createUnitTestEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
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
        'redis',
        {
          cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
        },
      ],
    ]),
  );
};
