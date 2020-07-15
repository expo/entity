import { instance, mock, when } from 'ts-mockito';

import EntityCompanion from '../EntityCompanion';
import EntityLoaderFactory from '../EntityLoaderFactory';
import EntityMutatorFactory from '../EntityMutatorFactory';
import EntityTableDataCoordinator from '../internal/EntityTableDataCoordinator';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import TestEntity, {
  TestEntityPrivacyPolicy,
  testEntityConfiguration,
} from '../testfixtures/TestEntity';

describe(EntityCompanion, () => {
  it('correctly instantiates mutator and loader factories', () => {
    const tableDataCoordinatorMock = mock(EntityTableDataCoordinator);
    when(tableDataCoordinatorMock.entityConfiguration).thenReturn(testEntityConfiguration);

    const companion = new EntityCompanion(
      TestEntity,
      instance(tableDataCoordinatorMock),
      TestEntityPrivacyPolicy,
      {},
      instance(mock<IEntityMetricsAdapter>())
    );
    expect(companion.getLoaderFactory()).toBeInstanceOf(EntityLoaderFactory);
    expect(companion.getMutatorFactory()).toBeInstanceOf(EntityMutatorFactory);
  });
});
