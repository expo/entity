import { InMemoryFullCacheStubCacheAdapterProvider } from './StubCacheAdapter';
import { StubDatabaseAdapterProvider } from './StubDatabaseAdapterProvider';
import { StubQueryContextProvider } from './StubQueryContextProvider';
import { EntityCompanionProvider } from '../../EntityCompanionProvider';
import { IEntityMetricsAdapter } from '../../metrics/IEntityMetricsAdapter';
import { NoOpEntityMetricsAdapter } from '../../metrics/NoOpEntityMetricsAdapter';

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
