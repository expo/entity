import type { EntityQueryContext, IEntityMetricsAdapter } from '@expo/entity';
import { EntityMetricsLoadType, NoOpEntityMetricsAdapter } from '@expo/entity';
import { StubQueryContextProvider } from '@expo/entity-testing-utils';
import { describe, expect, it } from '@jest/globals';
import { anyNumber, anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';

import { OrderByOrdering } from '../../BasePostgresEntityDatabaseAdapter.ts';
import { PaginationStrategy } from '../../PaginationStrategy.ts';
import { PostgresEntityDatabaseAdapter } from '../../PostgresEntityDatabaseAdapter.ts';
import { sql } from '../../SQLOperator.ts';
import type { TestFields } from '../../__tests__/fixtures/TestEntity.ts';
import { TestEntity, testEntityConfiguration } from '../../__tests__/fixtures/TestEntity.ts';
import { EntityKnexDataManager } from '../EntityKnexDataManager.ts';

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

        verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).never();
      });
    });
  });

  describe('row locking modifiers', () => {
    const fieldObject = {
      customIdField: '1',
      testIndexedField: 'unique1',
      stringField: 'hello',
      intField: 1,
      dateField: new Date(),
      nullableField: null,
    };

    it('throws when loading by field equality conjunction outside of a transaction', async () => {
      const queryContext = new StubQueryContextProvider().getQueryContext();
      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );
      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      await expect(
        entityDataManager.loadManyByFieldEqualityConjunctionAsync(queryContext, [], {
          forUpdate: true,
        }),
      ).rejects.toThrow('require a transactional query context');
      verify(
        databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).never();
    });

    it('throws when loading by SQL fragment outside of a transaction', async () => {
      const queryContext = new StubQueryContextProvider().getQueryContext();
      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );
      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      await expect(
        entityDataManager.loadManyBySQLFragmentAsync(queryContext, sql`TRUE`, {
          forUpdate: true,
        }),
      ).rejects.toThrow('require a transactional query context');
      verify(
        databaseAdapterMock.fetchManyBySQLFragmentAsync(anything(), anything(), anything()),
      ).never();
    });

    it('passes forUpdate through to the database adapter inside of a transaction', async () => {
      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );
      when(
        databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([fieldObject]);
      when(
        databaseAdapterMock.fetchManyBySQLFragmentAsync(anything(), anything(), anything()),
      ).thenResolve([fieldObject]);

      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        const equalityResults = await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
          queryContext,
          [{ fieldName: 'stringField', fieldValue: 'hello' }],
          { forUpdate: true, limit: 1 },
        );
        expect(equalityResults).toHaveLength(1);

        const sqlResults = await entityDataManager.loadManyBySQLFragmentAsync(
          queryContext,
          sql`TRUE`,
          { forUpdate: true },
        );
        expect(sqlResults).toHaveLength(1);

        verify(
          databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
            queryContext,
            anything(),
            deepEqual({ forUpdate: true, limit: 1 }),
          ),
        ).once();
        verify(
          databaseAdapterMock.fetchManyBySQLFragmentAsync(
            queryContext,
            anything(),
            deepEqual({ forUpdate: true }),
          ),
        ).once();
      });
    });

    it('throws when forShare is used outside of a transaction', async () => {
      const queryContext = new StubQueryContextProvider().getQueryContext();
      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );
      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      await expect(
        entityDataManager.loadManyByFieldEqualityConjunctionAsync(queryContext, [], {
          forShare: true,
        }),
      ).rejects.toThrow('require a transactional query context');
      await expect(
        entityDataManager.loadManyBySQLFragmentAsync(queryContext, sql`TRUE`, { forShare: true }),
      ).rejects.toThrow('require a transactional query context');
    });

    it('throws when forUpdate and forShare are both set', async () => {
      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );
      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        await expect(
          entityDataManager.loadManyByFieldEqualityConjunctionAsync(queryContext, [], {
            forUpdate: true,
            forShare: true,
          }),
        ).rejects.toThrow('forUpdate and forShare are mutually exclusive');
        await expect(
          entityDataManager.loadManyBySQLFragmentAsync(queryContext, sql`TRUE`, {
            forUpdate: true,
            forShare: true,
          }),
        ).rejects.toThrow('forUpdate and forShare are mutually exclusive');
      });
      verify(
        databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).never();
      verify(
        databaseAdapterMock.fetchManyBySQLFragmentAsync(anything(), anything(), anything()),
      ).never();
    });

    it('throws when skipLocked is set without forUpdate or forShare', async () => {
      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );
      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        await expect(
          entityDataManager.loadManyByFieldEqualityConjunctionAsync(queryContext, [], {
            skipLocked: true,
          }),
        ).rejects.toThrow('skipLocked requires forUpdate or forShare');
        await expect(
          entityDataManager.loadManyBySQLFragmentAsync(queryContext, sql`TRUE`, {
            skipLocked: true,
          }),
        ).rejects.toThrow('skipLocked requires forUpdate or forShare');
      });
    });

    it('passes forShare and skipLocked through to the database adapter inside of a transaction', async () => {
      const databaseAdapterMock = mock<PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>>(
        PostgresEntityDatabaseAdapter,
      );
      when(
        databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([fieldObject]);
      when(
        databaseAdapterMock.fetchManyBySQLFragmentAsync(anything(), anything(), anything()),
      ).thenResolve([fieldObject]);

      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        await entityDataManager.loadManyByFieldEqualityConjunctionAsync(queryContext, [], {
          forShare: true,
          skipLocked: true,
        });
        await entityDataManager.loadManyBySQLFragmentAsync(queryContext, sql`TRUE`, {
          forUpdate: true,
          skipLocked: true,
        });

        verify(
          databaseAdapterMock.fetchManyByFieldEqualityConjunctionAsync(
            queryContext,
            anything(),
            deepEqual({ forShare: true, skipLocked: true }),
          ),
        ).once();
        verify(
          databaseAdapterMock.fetchManyBySQLFragmentAsync(
            queryContext,
            anything(),
            deepEqual({ forUpdate: true, skipLocked: true }),
          ),
        ).once();
      });
    });

    it('does not require a transaction when no row locking modifier is set', async () => {
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
      ).thenResolve([fieldObject]);
      const entityDataManager = new EntityKnexDataManager(
        testEntityConfiguration,
        instance(databaseAdapterMock),
        new NoOpEntityMetricsAdapter(),
        TestEntity.name,
      );

      const results = await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
        queryContext,
        [],
        { forUpdate: false, forShare: false, skipLocked: false },
      );
      expect(results).toHaveLength(1);
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
