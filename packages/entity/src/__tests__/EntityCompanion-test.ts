import { describe, expect, it } from '@jest/globals';
import { instance, mock, when } from 'ts-mockito';

import { EntityCompanion } from '../EntityCompanion.ts';
import { EntityCompanionProvider } from '../EntityCompanionProvider.ts';
import { EntityLoaderFactory } from '../EntityLoaderFactory.ts';
import type { EntityMutationTriggerConfiguration } from '../EntityMutationTriggerConfiguration.ts';
import { EntityMutatorFactory } from '../EntityMutatorFactory.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import type { EntityTableDataCoordinator } from '../internal/EntityTableDataCoordinator.ts';
import type { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter.ts';
import { NoOpEntityMetricsAdapter } from '../metrics/NoOpEntityMetricsAdapter.ts';
import type { TestMTFields } from '../utils/__testfixtures__/TestEntityWithMutationTriggers.ts';
import {
  testEntityMTConfiguration,
  TestEntityWithMutationTriggers,
  TestMutationTrigger,
} from '../utils/__testfixtures__/TestEntityWithMutationTriggers.ts';

describe(EntityCompanion, () => {
  it('correctly instantiates mutator and loader factories', () => {
    const entityCompanionProvider = instance(mock<EntityCompanionProvider>());

    const tableDataCoordinatorMock = mock<EntityTableDataCoordinator<TestMTFields, 'id'>>();
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
      'id',
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

    const tableDataCoordinatorMock = mock<EntityTableDataCoordinator<TestMTFields, 'id'>>();
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

    expect(mergedTriggers).toStrictEqual({
      afterCreate: [localTriggers!.afterCreate![0], globalMutationTriggers.afterCreate![0]],
      afterAll: [localTriggers!.afterAll![0], globalMutationTriggers.afterAll![0]],
      afterCommit: [localTriggers!.afterCommit![0]],
    });
  });
  it('returns correct metrics adapter', () => {
    const entityCompanionProvider = instance(mock<EntityCompanionProvider>());

    const tableDataCoordinatorMock = mock<EntityTableDataCoordinator<TestMTFields, 'id'>>();
    when(tableDataCoordinatorMock.entityConfiguration).thenReturn(testEntityMTConfiguration);

    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapterInstance = instance(metricsAdapterMock);

    const companion = new EntityCompanion(
      entityCompanionProvider,
      TestEntityWithMutationTriggers.defineCompanionDefinition(),
      instance(tableDataCoordinatorMock),
      metricsAdapterInstance,
    );

    expect(companion.getMetricsAdapter()).toBe(metricsAdapterInstance);
  });
});
