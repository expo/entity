import { instance, mock } from 'ts-mockito';

import EntityCompanion from '../EntityCompanion';
import EntityLoaderFactory from '../EntityLoaderFactory';
import EntityMutatorFactory from '../EntityMutatorFactory';
import IEntityQueryContextProvider from '../IEntityQueryContextProvider';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import { NoCacheStubCacheAdapterProvider } from '../testfixtures/StubCacheAdapter';
import StubDatabaseAdapter from '../testfixtures/StubDatabaseAdapter';
import TestEntity, {
  TestEntityPrivacyPolicy,
  testEntityConfiguration,
} from '../testfixtures/TestEntity';

describe(EntityCompanion, () => {
  it('correctly instantiates mutator and loader factories', () => {
    const companion = new EntityCompanion(
      TestEntity,
      testEntityConfiguration,
      StubDatabaseAdapter,
      new NoCacheStubCacheAdapterProvider(),
      TestEntityPrivacyPolicy,
      instance(mock<IEntityQueryContextProvider>()),
      instance(mock<IEntityMetricsAdapter>())
    );
    expect(companion.getLoaderFactory()).toBeInstanceOf(EntityLoaderFactory);
    expect(companion.getMutatorFactory()).toBeInstanceOf(EntityMutatorFactory);
  });
});
