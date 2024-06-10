import { instance, mock, when } from 'ts-mockito';

import EntityCompanion from '../EntityCompanion';
import EntityCompanionProvider from '../EntityCompanionProvider';
import EntityLoaderFactory from '../EntityLoaderFactory';
import EntityMutationTriggerConfiguration from '../EntityMutationTriggerConfiguration';
import EntityMutatorFactory from '../EntityMutatorFactory';
import ViewerContext from '../ViewerContext';
import EntityTableDataCoordinator from '../internal/EntityTableDataCoordinator';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import NoOpEntityMetricsAdapter from '../metrics/NoOpEntityMetricsAdapter';
import TestEntityWithMutationTriggers, {
  TestMTFields,
  testEntityMTConfiguration,
  TestMutationTrigger,
} from '../testfixtures/TestEntityWithMutationTriggers';

describe(EntityCompanion, () => {
  it('correctly instantiates mutator and loader factories', () => {
    const entityCompanionProvider = instance(mock<EntityCompanionProvider>());

    const tableDataCoordinatorMock = mock<EntityTableDataCoordinator<TestMTFields>>();
    when(tableDataCoordinatorMock.entityConfiguration).thenReturn(testEntityMTConfiguration);

    const companion = new EntityCompanion(
      entityCompanionProvider,
      TestEntityWithMutationTriggers.defineCompanionDefinition(),
      instance(tableDataCoordinatorMock),
      instance(mock<IEntityMetricsAdapter>()),
    );
    expect(companion.getLoaderFactory()).toBeInstanceOf(EntityLoaderFactory);
    expect(companion.getMutatorFactory()).toBeInstanceOf(EntityMutatorFactory);
  });

  it('correctly merges local and global mutation triggers', () => {
    const globalMutationTriggers: EntityMutationTriggerConfiguration<
      TestMTFields,
      string,
      ViewerContext,
      TestEntityWithMutationTriggers,
      keyof TestMTFields
    > = {
      afterCreate: [new TestMutationTrigger('globalAfterCreate')],
      afterAll: [new TestMutationTrigger('globalAfterAll')],
    };

    const metricsAdapter = new NoOpEntityMetricsAdapter();

    const entityCompanionProvider = new EntityCompanionProvider(
      metricsAdapter,
      new Map(),
      new Map(),
      globalMutationTriggers,
    );

    const tableDataCoordinatorMock = mock<EntityTableDataCoordinator<TestMTFields>>();
    when(tableDataCoordinatorMock.entityConfiguration).thenReturn(testEntityMTConfiguration);

    const companion = new EntityCompanion(
      entityCompanionProvider,
      TestEntityWithMutationTriggers.defineCompanionDefinition(),
      instance(tableDataCoordinatorMock),
      instance(mock<IEntityMetricsAdapter>()),
    );
    expect(companion.getLoaderFactory()).toBeInstanceOf(EntityLoaderFactory);
    expect(companion.getMutatorFactory()).toBeInstanceOf(EntityMutatorFactory);

    const mergedTriggers = companion.getMutatorFactory()['mutationTriggers'];

    const localTriggers = companion.entityCompanionDefinition.mutationTriggers;
    expect(localTriggers).toBeTruthy();

    expect(mergedTriggers.afterCreate![0]).toBe(localTriggers!.afterCreate![0]);
    expect(mergedTriggers.afterCreate![1]).toBe(globalMutationTriggers.afterCreate![0]);
    expect(mergedTriggers.afterAll![0]).toBe(localTriggers!.afterAll![0]);
    expect(mergedTriggers.afterAll![1]).toBe(globalMutationTriggers!.afterAll![0]);
    expect(mergedTriggers.afterCommit![0]).toBe(localTriggers!.afterCommit![0]);
  });
});
