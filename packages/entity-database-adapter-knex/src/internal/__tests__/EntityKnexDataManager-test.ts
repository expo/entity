import {
  EntityMetricsLoadType,
  EntityQueryContext,
  IEntityMetricsAdapter,
  NoOpEntityMetricsAdapter,
} from '@expo/entity';
import { StubQueryContextProvider } from '@expo/entity-testing-utils';
import { describe, expect, it } from '@jest/globals';
import {
  anyNumber,
  anyString,
  anything,
  deepEqual,
  instance,
  mock,
  resetCalls,
  verify,
  when,
} from 'ts-mockito';

import { PostgresEntityDatabaseAdapter } from '../../PostgresEntityDatabaseAdapter';
import { TestEntity, TestFields } from '../../__tests__/fixtures/TestEntity';
import { EntityKnexDataManager } from '../EntityKnexDataManager';

describe(EntityKnexDataManager, () => {
  it('loads by field equality conjunction and does not cache', async () => {
    const queryContext = instance(mock<EntityQueryContext>());
    const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
      PostgresEntityDatabaseAdapter,
    );
    when(
      databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        anything(),
        anything(),
      ),
    ).thenResolve([
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
    ]);
    const entityDataManager = new EntityKnexDataManager(
      instance(databaseAdapterMock),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

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

    verify(
      databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        anything(),
        anything(),
      ),
    ).once();
  });

  describe('metrics', () => {
    it('records metrics appropriately outside of transactions', async () => {
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );

      when(
        databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([
        {
          customIdField: '1',
          testIndexedField: 'unique1',
          stringField: 'hello',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ]);
      when(
        databaseAdapterMock.fetchManyByRawWhereClauseAsync(
          anything(),
          anyString(),
          anything(),
          anything(),
        ),
      ).thenResolve([]);

      const entityDataManager = new EntityKnexDataManager(
        instance(databaseAdapterMock),
        metricsAdapter,
        TestEntity.name,
      );

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

      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );

      when(
        databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([
        {
          customIdField: '1',
          testIndexedField: 'unique1',
          stringField: 'hello',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ]);
      when(
        databaseAdapterMock.fetchManyByRawWhereClauseAsync(
          anything(),
          anyString(),
          anything(),
          anything(),
        ),
      ).thenResolve([]);

      const entityDataManager = new EntityKnexDataManager(
        instance(databaseAdapterMock),
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
