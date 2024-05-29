import { instance, mock } from 'ts-mockito';

import { OrderByOrdering } from '../../../EntityDatabaseAdapter';
import { EntityQueryContext } from '../../../EntityQueryContext';
import {
  DateIDTestFields,
  dateIDTestEntityConfiguration,
} from '../../../testfixtures/DateIDTestEntity';
import {
  SimpleTestFields,
  simpleTestEntityConfiguration,
} from '../../../testfixtures/SimpleTestEntity';
import { TestFields, testEntityConfiguration } from '../../../testfixtures/TestEntity';
import {
  NumberKeyFields,
  numberKeyEntityConfiguration,
} from '../../../testfixtures/TestEntityNumberKey';
import StubDatabaseAdapter from '../StubDatabaseAdapter';

describe(StubDatabaseAdapter, () => {
  describe('fetchManyWhereAsync', () => {
    it('fetches many where', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        StubDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'hello',
                  testIndexedField: 'h1',
                  intField: 5,
                  stringField: 'huh',
                  dateField: new Date(),
                  nullableField: null,
                },
                {
                  customIdField: 'world',
                  testIndexedField: 'h2',
                  intField: 3,
                  stringField: 'wat',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ])
        )
      );

      const results = await databaseAdapter.fetchManyWhereAsync(queryContext, 'stringField', [
        'huh',
      ]);
      expect(results.get('huh')).toHaveLength(1);
    });
  });

  describe('fetchManyByFieldEqualityConjunctionAsync', () => {
    it('supports conjuntions and query modifiers', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        StubDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'hello',
                  testIndexedField: 'h1',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
                {
                  customIdField: 'world',
                  testIndexedField: 'h2',
                  intField: 3,
                  stringField: 'b',
                  dateField: new Date(),
                  nullableField: null,
                },
                {
                  customIdField: 'world',
                  testIndexedField: 'h2',
                  intField: 3,
                  stringField: 'c',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ])
        )
      );

      const results = await databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        [
          {
            fieldName: 'customIdField',
            fieldValues: ['hello', 'world'],
          },
          {
            fieldName: 'intField',
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
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        StubDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'hello',
                  testIndexedField: 'h1',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
                {
                  customIdField: 'world',
                  testIndexedField: 'h2',
                  intField: 3,
                  stringField: 'b',
                  dateField: new Date(),
                  nullableField: null,
                },
                {
                  customIdField: 'world',
                  testIndexedField: 'h2',
                  intField: 3,
                  stringField: 'c',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ])
        )
      );

      const results = await databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        [
          {
            fieldName: 'intField',
            fieldValue: 3,
          },
        ],
        {
          orderBy: [
            {
              fieldName: 'intField',
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

    it('supports null field values', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        StubDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: '1',
                  testIndexedField: 'h1',
                  intField: 1,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: 'a',
                },
                {
                  customIdField: '2',
                  testIndexedField: 'h2',
                  intField: 2,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: 'b',
                },
                {
                  customIdField: '3',
                  testIndexedField: 'h3',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
                {
                  customIdField: '4',
                  testIndexedField: 'h4',
                  intField: 4,
                  stringField: 'b',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ])
        )
      );

      const results = await databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        [{ fieldName: 'nullableField', fieldValue: null }],
        {}
      );
      expect(results).toHaveLength(2);
      expect(results[0]!.nullableField).toBeNull();

      const results2 = await databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        [
          { fieldName: 'nullableField', fieldValues: ['a', null] },
          { fieldName: 'stringField', fieldValue: 'a' },
        ],
        {
          orderBy: [
            {
              fieldName: 'nullableField',
              order: OrderByOrdering.DESCENDING,
            },
          ],
        }
      );
      expect(results2).toHaveLength(2);
      expect(results2.map((e) => e.nullableField)).toEqual([null, 'a']);
    });
  });

  describe('fetchManyByRawWhereClauseAsync', () => {
    it('throws because it is unsupported', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        new Map()
      );
      await expect(
        databaseAdapter.fetchManyByRawWhereClauseAsync(queryContext, '', [], {})
      ).rejects.toThrow();
    });
  });

  describe('insertAsync', () => {
    it('inserts a record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        new Map()
      );
      const result = await databaseAdapter.insertAsync(queryContext, {
        stringField: 'hello',
      });
      expect(result).toMatchObject({
        stringField: 'hello',
      });

      expect(
        databaseAdapter.getObjectCollectionForTable(testEntityConfiguration.tableName)
      ).toHaveLength(1);
    });
  });

  describe('updateAsync', () => {
    it('updates a record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        StubDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'hello',
                  testIndexedField: 'h1',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ])
        )
      );
      const result = await databaseAdapter.updateAsync(queryContext, 'customIdField', 'hello', {
        stringField: 'b',
      });
      expect(result).toMatchObject({
        stringField: 'b',
        testIndexedField: 'h1',
      });
    });

    it('throws error when empty update to match common DBMS behavior', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        StubDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'hello',
                  testIndexedField: 'h1',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ])
        )
      );
      await expect(
        databaseAdapter.updateAsync(queryContext, 'customIdField', 'hello', {})
      ).rejects.toThrowError(`Empty update (custom_id = hello)`);
    });
  });

  describe('deleteAsync', () => {
    it('deletes an object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields>(
        testEntityConfiguration,
        StubDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'hello',
                  testIndexedField: 'h1',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ])
        )
      );

      await databaseAdapter.deleteAsync(queryContext, 'customIdField', 'hello');

      expect(
        databaseAdapter.getObjectCollectionForTable(testEntityConfiguration.tableName)
      ).toHaveLength(0);
    });
  });

  it('supports string and number IDs', async () => {
    const queryContext = instance(mock(EntityQueryContext));
    const databaseAdapter1 = new StubDatabaseAdapter<SimpleTestFields>(
      simpleTestEntityConfiguration,
      new Map()
    );
    const insertedObject1 = await databaseAdapter1.insertAsync(queryContext, {});
    expect(typeof insertedObject1.id).toBe('string');

    const databaseAdapter2 = new StubDatabaseAdapter<NumberKeyFields>(
      numberKeyEntityConfiguration,
      new Map()
    );
    const insertedObject2 = await databaseAdapter2.insertAsync(queryContext, {});
    expect(typeof insertedObject2.id).toBe('number');

    const databaseAdapter3 = new StubDatabaseAdapter<DateIDTestFields>(
      dateIDTestEntityConfiguration,
      new Map()
    );
    await expect(databaseAdapter3.insertAsync(queryContext, {})).rejects.toThrowError(
      'Unsupported ID type for StubDatabaseAdapter: DateField'
    );
  });

  describe('compareByOrderBys', () => {
    describe('comparison', () => {
      it.each([
        // nulls compare with 0
        [OrderByOrdering.DESCENDING, null, 0, -1],
        [OrderByOrdering.ASCENDING, null, 0, 1],
        [OrderByOrdering.DESCENDING, 0, null, 1],
        [OrderByOrdering.ASCENDING, 0, null, -1],

        // nulls compare with nulls
        [OrderByOrdering.DESCENDING, null, null, 0],
        [OrderByOrdering.ASCENDING, null, null, 0],

        // nulls compare with -1
        [OrderByOrdering.DESCENDING, null, -1, -1],
        [OrderByOrdering.ASCENDING, null, -1, 1],
        [OrderByOrdering.DESCENDING, -1, null, 1],
        [OrderByOrdering.ASCENDING, -1, null, -1],

        // basic compares
        [OrderByOrdering.ASCENDING, 'a', 'b', -1],
        [OrderByOrdering.ASCENDING, 'b', 'a', 1],
        [OrderByOrdering.DESCENDING, 'a', 'b', 1],
        [OrderByOrdering.DESCENDING, 'b', 'a', -1],
      ])('case (%p; %p; %p)', (order, v1, v2, expectedResult) => {
        expect(
          StubDatabaseAdapter['compareByOrderBys'](
            [
              {
                columnName: 'hello',
                order,
              },
            ],
            {
              hello: v1,
            },
            {
              hello: v2,
            }
          )
        ).toEqual(expectedResult);
      });

      it('works for empty', () => {
        expect(
          StubDatabaseAdapter['compareByOrderBys'](
            [],
            {
              hello: 'test',
            },
            {
              hello: 'blah',
            }
          )
        ).toEqual(0);
      });
    });

    describe('recursing', () => {
      expect(
        StubDatabaseAdapter['compareByOrderBys'](
          [
            {
              columnName: 'hello',
              order: OrderByOrdering.ASCENDING,
            },
            {
              columnName: 'world',
              order: OrderByOrdering.ASCENDING,
            },
          ],
          {
            hello: 'a',
            world: 1,
          },
          {
            hello: 'a',
            world: 2,
          }
        )
      ).toEqual(-1);
    });
  });
});
