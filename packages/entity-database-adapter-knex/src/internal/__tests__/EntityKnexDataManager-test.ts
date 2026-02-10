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

  describe('loadPageBySQLFragmentAsync', () => {
    describe('includeTotal functionality', () => {
      it('includes totalCount when includeTotal is true', async () => {
        const queryContext = instance(mock<EntityQueryContext>());
        const databaseAdapterMock = mock<
          PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>
        >(PostgresEntityDatabaseAdapter);

        // Mock the new window function method
        when(
          databaseAdapterMock.fetchManyBySQLFragmentWithCountAsync(
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve({
          results: [
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
              stringField: 'world',
              intField: 2,
              dateField: new Date(),
              nullableField: null,
            },
          ],
          totalCount: 42,
        });

        const entityDataManager = new EntityKnexDataManager(
          testEntityConfiguration,
          instance(databaseAdapterMock),
          new NoOpEntityMetricsAdapter(),
          TestEntity.name,
        );

        const result = await entityDataManager.loadPageBySQLFragmentAsync(queryContext, {
          first: 10,
          includeTotal: true,
        });

        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(42);
        // Verify the new method is called instead of separate count query
        verify(
          databaseAdapterMock.fetchManyBySQLFragmentWithCountAsync(
            anything(),
            anything(),
            anything(),
          ),
        ).once();
        verify(databaseAdapterMock.fetchCountBySQLFragmentAsync(anything(), anything())).never();
      });

      it('does not include totalCount when includeTotal is false', async () => {
        const queryContext = instance(mock<EntityQueryContext>());
        const databaseAdapterMock = mock<
          PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>
        >(PostgresEntityDatabaseAdapter);

        when(
          databaseAdapterMock.fetchManyBySQLFragmentAsync(anything(), anything(), anything()),
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
          new NoOpEntityMetricsAdapter(),
          TestEntity.name,
        );

        const result = await entityDataManager.loadPageBySQLFragmentAsync(queryContext, {
          first: 10,
          includeTotal: false,
        });

        expect(result.edges).toHaveLength(1);
        expect(result.totalCount).toBeUndefined();
        verify(databaseAdapterMock.fetchCountBySQLFragmentAsync(anything(), anything())).never();
      });

      it('does not include totalCount when includeTotal is not specified', async () => {
        const queryContext = instance(mock<EntityQueryContext>());
        const databaseAdapterMock = mock<
          PostgresEntityDatabaseAdapter<TestFields, 'customIdField'>
        >(PostgresEntityDatabaseAdapter);

        when(
          databaseAdapterMock.fetchManyBySQLFragmentAsync(anything(), anything(), anything()),
        ).thenResolve([]);

        const entityDataManager = new EntityKnexDataManager(
          testEntityConfiguration,
          instance(databaseAdapterMock),
          new NoOpEntityMetricsAdapter(),
          TestEntity.name,
        );

        const result = await entityDataManager.loadPageBySQLFragmentAsync(queryContext, {
          first: 10,
        });

        expect(result.totalCount).toBeUndefined();
        verify(databaseAdapterMock.fetchCountBySQLFragmentAsync(anything(), anything())).never();
      });
    });
  });
});
