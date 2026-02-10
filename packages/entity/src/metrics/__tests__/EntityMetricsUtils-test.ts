import { describe, expect, it } from '@jest/globals';
import { anyNumber, deepEqual, instance, mock, verify, when } from 'ts-mockito';

import { EntityQueryContext } from '../../EntityQueryContext';
import {
  timeAndLogLoadEventAsync,
  timeAndLogLoadOneEventAsync,
  timeAndLogLoadEventGenericAsync,
  timeAndLogLoadMapEventAsync,
  timeAndLogMutationEventAsync,
} from '../EntityMetricsUtils';
import {
  EntityMetricsLoadType,
  EntityMetricsMutationType,
  IEntityMetricsAdapter,
} from '../IEntityMetricsAdapter';

describe(timeAndLogLoadEventAsync, () => {
  it('returns the result from the wrapped promise and logs', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const queryContextMock = mock<EntityQueryContext>();
    when(queryContextMock.isInTransaction()).thenReturn(false);
    const queryContext = instance(queryContextMock);

    const expectedResult = [{ id: 1 }, { id: 2 }];

    const result = await timeAndLogLoadEventAsync(
      metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY,
      'TestEntity',
      queryContext,
    )(Promise.resolve(expectedResult));

    expect(result).toBe(expectedResult);

    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        deepEqual({
          type: EntityMetricsLoadType.LOAD_MANY,
          isInTransaction: false,
          entityClassName: 'TestEntity',
          duration: anyNumber(),
          count: expectedResult.length,
        }),
      ),
    ).once();
  });
});

describe(timeAndLogLoadOneEventAsync, () => {
  it('returns the result from the wrapped promise and logs with count 1 when result is not null', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const queryContextMock = mock<EntityQueryContext>();
    when(queryContextMock.isInTransaction()).thenReturn(true);
    const queryContext = instance(queryContextMock);

    const expectedResult = { id: 1 };

    const result = await timeAndLogLoadOneEventAsync(
      metricsAdapter,
      EntityMetricsLoadType.LOAD_ONE,
      'TestEntity',
      queryContext,
    )(Promise.resolve(expectedResult));

    expect(result).toBe(expectedResult);

    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        deepEqual({
          type: EntityMetricsLoadType.LOAD_ONE,
          isInTransaction: true,
          entityClassName: 'TestEntity',
          duration: anyNumber(),
          count: 1,
        }),
      ),
    ).once();
  });

  it('logs with count 0 when result is null', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const queryContextMock = mock<EntityQueryContext>();
    when(queryContextMock.isInTransaction()).thenReturn(true);
    const queryContext = instance(queryContextMock);

    const result = await timeAndLogLoadOneEventAsync(
      metricsAdapter,
      EntityMetricsLoadType.LOAD_ONE,
      'TestEntity',
      queryContext,
    )(Promise.resolve(null));

    expect(result).toBeNull();

    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        deepEqual({
          type: EntityMetricsLoadType.LOAD_ONE,
          isInTransaction: true,
          entityClassName: 'TestEntity',
          duration: anyNumber(),
          count: 0,
        }),
      ),
    ).once();
  });
});

describe(timeAndLogLoadEventGenericAsync, () => {
  it('returns the result from the wrapped promise and logs with count extracted from result', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const queryContextMock = mock<EntityQueryContext>();
    when(queryContextMock.isInTransaction()).thenReturn(false);
    const queryContext = instance(queryContextMock);

    const expectedResult = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] };

    const result = await timeAndLogLoadEventGenericAsync<{ items: { id: number }[] }>(
      metricsAdapter,
      EntityMetricsLoadType.LOAD_PAGE,
      'TestEntity',
      queryContext,
      (r) => r.items.length,
    )(Promise.resolve(expectedResult));

    expect(result).toBe(expectedResult);

    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        deepEqual({
          type: EntityMetricsLoadType.LOAD_PAGE,
          isInTransaction: false,
          entityClassName: 'TestEntity',
          duration: anyNumber(),
          count: expectedResult.items.length,
        }),
      ),
    ).once();
  });
});

describe(timeAndLogLoadMapEventAsync, () => {
  it('returns the result from the wrapped promise and logs with count summed across map values', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const queryContextMock = mock<EntityQueryContext>();
    when(queryContextMock.isInTransaction()).thenReturn(false);
    const queryContext = instance(queryContextMock);

    const key1 = { serialize: () => 'key1' };
    const key2 = { serialize: () => 'key2' };
    const expectedResult = new Map([
      [key1, [{ id: 1 }, { id: 2 }]],
      [key2, [{ id: 3 }]],
    ]);

    const result = await timeAndLogLoadMapEventAsync(
      metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY,
      'TestEntity',
      queryContext,
    )(Promise.resolve(expectedResult));

    expect(result).toBe(expectedResult);

    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        deepEqual({
          type: EntityMetricsLoadType.LOAD_MANY,
          isInTransaction: false,
          entityClassName: 'TestEntity',
          duration: anyNumber(),
          count: 3,
        }),
      ),
    ).once();
  });
});

describe(timeAndLogMutationEventAsync, () => {
  it('returns the result from the wrapped promise and logs', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const queryContextMock = mock<EntityQueryContext>();
    when(queryContextMock.isInTransaction()).thenReturn(true);
    const queryContext = instance(queryContextMock);

    const expectedResult = { id: 1, name: 'created' };

    const result = await timeAndLogMutationEventAsync(
      metricsAdapter,
      EntityMetricsMutationType.CREATE,
      'TestEntity',
      queryContext,
    )(Promise.resolve(expectedResult));

    expect(result).toBe(expectedResult);

    verify(
      metricsAdapterMock.logMutatorMutationEvent(
        deepEqual({
          type: EntityMetricsMutationType.CREATE,
          isInTransaction: true,
          entityClassName: 'TestEntity',
          duration: anyNumber(),
        }),
      ),
    ).once();
  });
});
