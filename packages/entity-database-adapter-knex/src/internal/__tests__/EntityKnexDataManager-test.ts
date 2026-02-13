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

import { OrderByOrdering } from '../../BasePostgresEntityDatabaseAdapter';
import { PaginationStrategy } from '../../PaginationStrategy';
import { PostgresEntityDatabaseAdapter } from '../../PostgresEntityDatabaseAdapter';
import {
  TestEntity,
  TestFields,
  testEntityConfiguration,
} from '../../__tests__/fixtures/TestEntity';
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
      testEntityConfiguration,
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
        testEntityConfiguration,
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
        testEntityConfiguration,
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

  describe('pagination', () => {
    describe('max page size validation', () => {
      it('should throw when first exceeds maxPageSize', async () => {
        const queryContext = instance(mock<EntityQueryContext>());
        const databaseAdapterMock = mock<
          PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>
        >(PostgresEntityDatabaseAdapter);

        // Configure the adapter to return a maxPageSize of 100
        when(databaseAdapterMock.paginationMaxPageSize).thenReturn(100);

        const entityDataManager = new EntityKnexDataManager(
          testEntityConfiguration,
          instance(databaseAdapterMock),
          new NoOpEntityMetricsAdapter(),
          TestEntity.name,
        );

        await expect(
          entityDataManager.loadPageAsync(queryContext, {
            first: 101,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'customIdField', order: OrderByOrdering.ASCENDING }],
            },
          }),
        ).rejects.toThrow('first must not exceed maximum page size of 100');
      });

      it('should throw when last exceeds maxPageSize', async () => {
        const queryContext = instance(mock<EntityQueryContext>());
        const databaseAdapterMock = mock<
          PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>
        >(PostgresEntityDatabaseAdapter);

        // Configure the adapter to return a maxPageSize of 100
        when(databaseAdapterMock.paginationMaxPageSize).thenReturn(100);

        const entityDataManager = new EntityKnexDataManager(
          testEntityConfiguration,
          instance(databaseAdapterMock),
          new NoOpEntityMetricsAdapter(),
          TestEntity.name,
        );

        await expect(
          entityDataManager.loadPageAsync(queryContext, {
            last: 101,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'customIdField', order: OrderByOrdering.ASCENDING }],
            },
          }),
        ).rejects.toThrow('last must not exceed maximum page size of 100');
      });

      it('should allow first/last within maxPageSize', async () => {
        const queryContext = instance(mock<EntityQueryContext>());
        const databaseAdapterMock = mock<
          PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>
        >(PostgresEntityDatabaseAdapter);

        // Configure the adapter to return a maxPageSize of 100
        when(databaseAdapterMock.paginationMaxPageSize).thenReturn(100);
        when(
          databaseAdapterMock.fetchManyBySQLFragmentAsync(queryContext, anything(), anything()),
        ).thenResolve([]);

        const entityDataManager = new EntityKnexDataManager(
          testEntityConfiguration,
          instance(databaseAdapterMock),
          new NoOpEntityMetricsAdapter(),
          TestEntity.name,
        );

        // This should not throw
        const result = await entityDataManager.loadPageAsync(queryContext, {
          first: 100,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [{ fieldName: 'customIdField', order: OrderByOrdering.ASCENDING }],
          },
        });

        expect(result.edges).toEqual([]);
      });

      it('should allow pagination when maxPageSize is not configured', async () => {
        const queryContext = instance(mock<EntityQueryContext>());
        const databaseAdapterMock = mock<
          PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>
        >(PostgresEntityDatabaseAdapter);

        // Configure the adapter to return undefined for maxPageSize
        when(databaseAdapterMock.paginationMaxPageSize).thenReturn(undefined);
        when(
          databaseAdapterMock.fetchManyBySQLFragmentAsync(queryContext, anything(), anything()),
        ).thenResolve([]);

        const entityDataManager = new EntityKnexDataManager(
          testEntityConfiguration,
          instance(databaseAdapterMock),
          new NoOpEntityMetricsAdapter(),
          TestEntity.name,
        );

        // This should not throw even with a large page size
        const result = await entityDataManager.loadPageAsync(queryContext, {
          first: 10000,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [{ fieldName: 'customIdField', order: OrderByOrdering.ASCENDING }],
          },
        });

        expect(result.edges).toEqual([]);
      });
    });
  });
});
