import {
  EntityCompanionProvider,
  IEntityMetricsAdapter,
  NoOpEntityMetricsAdapter,
} from '@expo/entity';
import {
  InMemoryFullCacheStubCacheAdapterProvider,
  StubQueryContextProvider,
} from '@expo/entity-testing-utils';

import { StubPostgresDatabaseAdapterProvider } from './StubPostgresDatabaseAdapterProvider';

const queryContextProvider = new StubQueryContextProvider();

/**
 * Entity companion provider for use in knex unit tests. All database and cache implementations
 * are replaced with in-memory simulations.
 */
export const createUnitTestPostgresEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    new Map([
      [
        'postgres',
        {
          adapterProvider: new StubPostgresDatabaseAdapterProvider(),
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
