import { instance, mock, when } from 'ts-mockito';

import EntityCompanion from '../EntityCompanion';
import EntityCompanionProvider from '../EntityCompanionProvider';
import EntityLoaderFactory from '../EntityLoaderFactory';
import EntityMutatorFactory from '../EntityMutatorFactory';
import EntityTableDataCoordinator from '../internal/EntityTableDataCoordinator';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import TestEntity, { testEntityConfiguration, TestFields } from '../testfixtures/TestEntity';

describe(EntityCompanion, () => {
  it('correctly instantiates mutator and loader factories', () => {
    const entityCompanionProvider = instance(mock<EntityCompanionProvider>());

    const tableDataCoordinatorMock = mock<EntityTableDataCoordinator<TestFields>>();
    when(tableDataCoordinatorMock.entityConfiguration).thenReturn(testEntityConfiguration);

    const companion = new EntityCompanion(
      entityCompanionProvider,
      TestEntity.defineCompanionDefinition(),
      instance(tableDataCoordinatorMock),
      instance(mock<IEntityMetricsAdapter>()),
    );
    expect(companion.getLoaderFactory()).toBeInstanceOf(EntityLoaderFactory);
    expect(companion.getMutatorFactory()).toBeInstanceOf(EntityMutatorFactory);
  });
});
