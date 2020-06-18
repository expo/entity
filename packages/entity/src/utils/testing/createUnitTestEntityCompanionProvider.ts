import EntityCompanionProvider, {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
} from '../../EntityCompanionProvider';
import IEntityMetricsAdapter from '../../metrics/IEntityMetricsAdapter';
import NoOpEntityMetricsAdapter from '../../metrics/NoOpEntityMetricsAdapter';
import { InMemoryFullCacheStubCacheAdapterProvider } from './StubCacheAdapter';
import StubDatabaseAdapterProvider from './StubDatabaseAdapterProvider';
import StubQueryContextProvider from './StubQueryContextProvider';

/**
 * Entity companion provider for use in unit tests. All database and cache implementations
 * are replaced with in-memory simulations.
 */
export const createUnitTestEntityCompanionProvider = (
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
        cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
      },
    }
  );
};
