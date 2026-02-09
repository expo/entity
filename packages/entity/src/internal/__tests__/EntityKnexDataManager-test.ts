import { describe, expect, it, jest } from '@jest/globals';
import {
  anyNumber,
  anyString,
  anything,
  deepEqual,
  instance,
  mock,
  resetCalls,
  spy,
  verify,
  when,
} from 'ts-mockito';

import { EntityMetricsLoadType, IEntityMetricsAdapter } from '../../metrics/IEntityMetricsAdapter';
import { NoOpEntityMetricsAdapter } from '../../metrics/NoOpEntityMetricsAdapter';
import { StubDatabaseAdapter } from '../../utils/__testfixtures__/StubDatabaseAdapter';
import { StubQueryContextProvider } from '../../utils/__testfixtures__/StubQueryContextProvider';
import {
  TestEntity,
  testEntityConfiguration,
  TestFields,
} from '../../utils/__testfixtures__/TestEntity';
import { EntityKnexDataManager } from '../EntityKnexDataManager';

const getObjects = (): Map<string, TestFields[]> =>
  new Map([
    [
      testEntityConfiguration.tableName,
      [
        {
          customIdField: '1',
          testIndexedField: 'unique1',
          stringField: 'hello',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: '2',
          testIndexedField: 'unique2',
          stringField: 'hello',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: '3',
          testIndexedField: 'unique3',
          stringField: 'world',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ],
    ],
  ]);

describe(EntityKnexDataManager, () => {
  it('loads by field equality conjunction and does not cache', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const entityDataManager = new EntityKnexDataManager(
      databaseAdapter,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyByFieldEqualityConjunctionAsync');

    const entityDatas = await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
      queryContext,
      [
        {
          fieldName: 'stringField',
          fieldValue: 'hello',
        },
        {
          fieldName: 'intField',
          fieldValue: 1,
        },
      ],
      {},
    );

    expect(entityDatas).toHaveLength(2);

    expect(dbSpy).toHaveBeenCalled();

    dbSpy.mockReset();
  });

  describe('metrics', () => {
    it('records metrics appropriately outside of transactions', async () => {
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);

      const objects = getObjects();
      const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        objects,
      );
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        dataStore,
      );
      const entityDataManager = new EntityKnexDataManager(
        databaseAdapter,
        metricsAdapter,
        TestEntity.name,
      );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
        queryContext,
        [
          {
            fieldName: 'testIndexedField',
            fieldValue: 'unique1',
          },
        ],
        {},
      );
      verify(
        metricsAdapterMock.logDataManagerLoadEvent(
          deepEqual({
            type: EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION,
            isInTransaction: false,
            entityClassName: TestEntity.name,
            duration: anyNumber(),
            count: 1,
          }),
        ),
      ).once();

      resetCalls(metricsAdapterMock);

      const databaseAdapterSpy = spy(databaseAdapter);
      when(
        databaseAdapterSpy.fetchManyByRawWhereClauseAsync(
          anything(),
          anyString(),
          anything(),
          anything(),
        ),
      ).thenResolve([]);
      await entityDataManager.loadManyByRawWhereClauseAsync(queryContext, '', [], {});
      verify(
        metricsAdapterMock.logDataManagerLoadEvent(
          deepEqual({
            type: EntityMetricsLoadType.LOAD_MANY_RAW,
            isInTransaction: false,
            entityClassName: TestEntity.name,
            duration: anyNumber(),
            count: 0,
          }),
        ),
      ).once();

      verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).never();
    });

    it('records metrics appropriately inside of transactions', async () => {
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);

      const objects = getObjects();
      const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        objects,
      );
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        dataStore,
      );
      const entityDataManager = new EntityKnexDataManager(
        databaseAdapter,
        metricsAdapter,
        TestEntity.name,
      );

      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
          queryContext,
          [
            {
              fieldName: 'testIndexedField',
              fieldValue: 'unique1',
            },
          ],
          {},
        );
        verify(
          metricsAdapterMock.logDataManagerLoadEvent(
            deepEqual({
              type: EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION,
              isInTransaction: true,
              entityClassName: TestEntity.name,
              duration: anyNumber(),
              count: 1,
            }),
          ),
        ).once();

        resetCalls(metricsAdapterMock);

        const databaseAdapterSpy = spy(databaseAdapter);
        when(
          databaseAdapterSpy.fetchManyByRawWhereClauseAsync(
            anything(),
            anyString(),
            anything(),
            anything(),
          ),
        ).thenResolve([]);
        await entityDataManager.loadManyByRawWhereClauseAsync(queryContext, '', [], {});
        verify(
          metricsAdapterMock.logDataManagerLoadEvent(
            deepEqual({
              type: EntityMetricsLoadType.LOAD_MANY_RAW,
              isInTransaction: true,
              entityClassName: TestEntity.name,
              duration: anyNumber(),
              count: 0,
            }),
          ),
        ).once();

        verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).never();
      });
    });
  });
});
