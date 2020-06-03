import { instance, mock } from 'ts-mockito';

import { OrderByOrdering } from '../../../EntityDatabaseAdapter';
import { EntityNonTransactionalQueryContext } from '../../../EntityQueryContext';
import { TestFields, testEntityConfiguration } from '../../../testfixtures/TestEntity';
import StubDatabaseAdapter from '../StubDatabaseAdapter';

describe(StubDatabaseAdapter, () => {
  describe('fetchManyWhereAsync', () => {
    it('fetches many where', async () => {
      const queryContext = instance(mock(EntityNonTransactionalQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, [
        {
          customIdField: 'hello',
          testIndexedField: 'h1',
          numberField: 5,
          stringField: 'huh',
          dateField: new Date(),
        },
        {
          customIdField: 'world',
          testIndexedField: 'h2',
          numberField: 3,
          stringField: 'wat',
          dateField: new Date(),
        },
      ]);

      const results = await databaseAdapter.fetchManyWhereAsync(queryContext, 'stringField', [
        'huh',
      ]);
      expect(results.get('huh')).toHaveLength(1);
    });
  });

  describe('fetchManyByFieldEqualityConjunctionAsync', () => {
    it('supports conjuntions and query modifiers', async () => {
      const queryContext = instance(mock(EntityNonTransactionalQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, [
        {
          customIdField: 'hello',
          testIndexedField: 'h1',
          numberField: 3,
          stringField: 'a',
          dateField: new Date(),
        },
        {
          customIdField: 'world',
          testIndexedField: 'h2',
          numberField: 3,
          stringField: 'b',
          dateField: new Date(),
        },
        {
          customIdField: 'world',
          testIndexedField: 'h2',
          numberField: 3,
          stringField: 'c',
          dateField: new Date(),
        },
      ]);

      const results = await databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        [
          {
            fieldName: 'customIdField',
            fieldValues: ['hello', 'world'],
          },
          {
            fieldName: 'numberField',
            fieldValue: 3,
          },
        ],
        {
          limit: 2,
          offset: 1,
          orderBy: [
            {
              fieldName: 'stringField',
              order: OrderByOrdering.DESCENDING,
            },
          ],
        }
      );

      expect(results).toHaveLength(2);
      expect(results.map((e) => e.stringField)).toEqual(['b', 'a']);
    });

    it('supports multiple order bys', async () => {
      const queryContext = instance(mock(EntityNonTransactionalQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, [
        {
          customIdField: 'hello',
          testIndexedField: 'h1',
          numberField: 3,
          stringField: 'a',
          dateField: new Date(),
        },
        {
          customIdField: 'world',
          testIndexedField: 'h2',
          numberField: 3,
          stringField: 'b',
          dateField: new Date(),
        },
        {
          customIdField: 'world',
          testIndexedField: 'h2',
          numberField: 3,
          stringField: 'c',
          dateField: new Date(),
        },
      ]);

      const results = await databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        [
          {
            fieldName: 'numberField',
            fieldValue: 3,
          },
        ],
        {
          orderBy: [
            {
              fieldName: 'numberField',
              order: OrderByOrdering.DESCENDING,
            },
            {
              fieldName: 'stringField',
              order: OrderByOrdering.DESCENDING,
            },
          ],
        }
      );

      expect(results).toHaveLength(3);
      expect(results.map((e) => e.stringField)).toEqual(['c', 'b', 'a']);
    });
  });

  describe('fetchManyByRawWhereClauseAsync', () => {
    it('throws because it is unsupported', async () => {
      const queryContext = instance(mock(EntityNonTransactionalQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, []);
      await expect(
        databaseAdapter.fetchManyByRawWhereClauseAsync(queryContext, '', [], {})
      ).rejects.toThrow();
    });
  });

  describe('insertAsync', () => {
    it('inserts a record', async () => {
      const queryContext = instance(mock(EntityNonTransactionalQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, []);
      const result = await databaseAdapter.insertAsync(queryContext, {
        stringField: 'hello',
      });
      expect(result).toMatchObject({
        stringField: 'hello',
      });

      expect(databaseAdapter.getAllObjectsForTest()).toHaveLength(1);
    });
  });

  describe('updateAsync', () => {
    it('updates a record', async () => {
      const queryContext = instance(mock(EntityNonTransactionalQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, [
        {
          customIdField: 'hello',
          testIndexedField: 'h1',
          numberField: 3,
          stringField: 'a',
          dateField: new Date(),
        },
      ]);
      const result = await databaseAdapter.updateAsync(queryContext, 'customIdField', 'hello', {
        stringField: 'b',
      });
      expect(result).toMatchObject({
        stringField: 'b',
        testIndexedField: 'h1',
      });
    });
  });

  describe('deleteAsync', () => {
    it('deletes an object', async () => {
      const queryContext = instance(mock(EntityNonTransactionalQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, [
        {
          customIdField: 'hello',
          testIndexedField: 'h1',
          numberField: 3,
          stringField: 'a',
          dateField: new Date(),
        },
      ]);

      await databaseAdapter.deleteAsync(queryContext, 'customIdField', 'hello');

      expect(databaseAdapter.getAllObjectsForTest()).toHaveLength(0);
    });
  });
});
