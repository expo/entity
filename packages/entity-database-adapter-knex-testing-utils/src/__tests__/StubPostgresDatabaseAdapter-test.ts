import {
  CompositeFieldHolder,
  CompositeFieldValueHolder,
  EntityQueryContext,
  SingleFieldHolder,
  SingleFieldValueHolder,
} from '@expo/entity';
import { OrderByOrdering, sql } from '@expo/entity-database-adapter-knex';
import { describe, expect, it, jest } from '@jest/globals';
import { instance, mock } from 'ts-mockito';
import { validate, version } from 'uuid';

import { StubPostgresDatabaseAdapter } from '../StubPostgresDatabaseAdapter';
import {
  DateIDTestFields,
  dateIDTestEntityConfiguration,
} from '../__testfixtures__/DateIDTestEntity';
import {
  SimpleTestFields,
  simpleTestEntityConfiguration,
} from '../__testfixtures__/SimpleTestEntity';
import { TestFields, testEntityConfiguration } from '../__testfixtures__/TestEntity';
import {
  NumberKeyFields,
  numberKeyEntityConfiguration,
} from '../__testfixtures__/TestEntityNumberKey';

// uuid keeps state internally for v7 generation, so we fix the time for all tests for consistent test results
const expectedTime = new Date('2024-06-03T20:16:33.761Z');
jest.useFakeTimers({
  now: expectedTime,
});

describe(StubPostgresDatabaseAdapter, () => {
  describe('fetchManyWhereAsync', () => {
    it('fetches many where single', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
      );

      const results = await databaseAdapter.fetchManyWhereAsync(
        queryContext,
        new SingleFieldHolder('stringField'),
        [new SingleFieldValueHolder('huh')],
      );
      expect(results.get(new SingleFieldValueHolder('huh'))).toHaveLength(1);
    });

    it('fetches many where composite', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
      );

      const results = await databaseAdapter.fetchManyWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['stringField', 'intField']),
        [new CompositeFieldValueHolder({ stringField: 'huh', intField: 5 })],
      );
      expect(
        results.get(new CompositeFieldValueHolder({ stringField: 'huh', intField: 5 })),
      ).toHaveLength(1);

      const results2 = await databaseAdapter.fetchManyWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['stringField', 'intField']),
        [new CompositeFieldValueHolder({ stringField: 'not-in-db', intField: 5 })],
      );
      expect(
        results2.get(new CompositeFieldValueHolder({ stringField: 'not-in-db', intField: 5 })),
      ).toHaveLength(0);
    });

    it('handles duplicate tuples and filters them out', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'id1',
                  testIndexedField: 'h1',
                  intField: 5,
                  stringField: 'test1',
                  dateField: new Date(),
                  nullableField: null,
                },
                {
                  customIdField: 'id2',
                  testIndexedField: 'h2',
                  intField: 10,
                  stringField: 'test2',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ]),
        ),
      );

      // Fetch with duplicate field values - this will cause uniqBy to filter duplicates
      const results = await databaseAdapter.fetchManyWhereAsync(
        queryContext,
        new SingleFieldHolder('customIdField'),
        [
          new SingleFieldValueHolder('id1'),
          new SingleFieldValueHolder('id2'),
          new SingleFieldValueHolder('id1'),
          new SingleFieldValueHolder('id2'),
        ],
      );

      // Should only get 2 unique results despite passing 4 values (2 duplicates)
      expect(results.get(new SingleFieldValueHolder('id1'))).toHaveLength(1);
      expect(results.get(new SingleFieldValueHolder('id2'))).toHaveLength(1);

      // Verify the actual objects returned
      const id1Results = results.get(new SingleFieldValueHolder('id1'));
      expect(id1Results?.[0]).toMatchObject({ customIdField: 'id1', stringField: 'test1' });

      const id2Results = results.get(new SingleFieldValueHolder('id2'));
      expect(id2Results?.[0]).toMatchObject({ customIdField: 'id2', stringField: 'test2' });
    });
  });

  describe('fetchOneWhereAsync', () => {
    it('fetches one where single', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
                  stringField: 'huh',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ]),
        ),
      );

      const result = await databaseAdapter.fetchOneWhereAsync(
        queryContext,
        new SingleFieldHolder('stringField'),
        new SingleFieldValueHolder('huh'),
      );
      expect(result).toMatchObject({
        stringField: 'huh',
      });
    });

    it('returns null when no record found', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        new Map(),
      );

      const result = await databaseAdapter.fetchOneWhereAsync(
        queryContext,
        new SingleFieldHolder('stringField'),
        new SingleFieldValueHolder('huh'),
      );
      expect(result).toBeNull();
    });

    it('fetches one where composite', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
                  intField: 5,
                  stringField: 'huh',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ]),
        ),
      );

      const result = await databaseAdapter.fetchOneWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['stringField', 'intField']),
        new CompositeFieldValueHolder({ stringField: 'huh', intField: 5 }),
      );
      expect(result).toMatchObject({
        stringField: 'huh',
        intField: 5,
      });
    });
  });

  describe('fetchManyByFieldEqualityConjunctionAsync', () => {
    it('supports conjuntions and query modifiers', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
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
        },
      );

      expect(results).toHaveLength(2);
      expect(results.map((e) => e.stringField)).toEqual(['b', 'a']);
    });

    it('supports multiple order bys', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
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
        },
      );

      expect(results).toHaveLength(3);
      expect(results.map((e) => e.stringField)).toEqual(['c', 'b', 'a']);
    });

    it('supports null field values', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
      );

      const results = await databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        [{ fieldName: 'nullableField', fieldValue: null }],
        {},
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
        },
      );
      expect(results2).toHaveLength(2);
      expect(results2.map((e) => e.nullableField)).toEqual([null, 'a']);
    });
  });

  describe('fetchManyByRawWhereClauseAsync', () => {
    it('throws because it is unsupported', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        new Map(),
      );
      await expect(
        databaseAdapter.fetchManyByRawWhereClauseAsync(queryContext, '', [], {}),
      ).rejects.toThrow();
    });
  });

  describe('fetchManyBySQLFragmentAsync', () => {
    it('throws because it is unsupported', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        new Map(),
      );
      await expect(
        databaseAdapter.fetchManyBySQLFragmentAsync(queryContext, sql``, {}),
      ).rejects.toThrow();
    });
  });

  describe('insertAsync', () => {
    it('inserts a record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        new Map(),
      );
      const result = await databaseAdapter.insertAsync(queryContext, {
        stringField: 'hello',
      });
      expect(result).toMatchObject({
        stringField: 'hello',
      });

      expect(
        databaseAdapter.getObjectCollectionForTable(testEntityConfiguration.tableName),
      ).toHaveLength(1);
    });

    it('inserts a record with valid v7 id', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        new Map(),
      );
      const result = await databaseAdapter.insertAsync(queryContext, {
        stringField: 'hello',
      });

      const ts = getTimeFromUUIDv7(result.customIdField);
      expect(ts).toEqual(expectedTime);
    });
  });

  describe('updateAsync', () => {
    it('updates a record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
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
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
      );
      await expect(
        databaseAdapter.updateAsync(queryContext, 'customIdField', 'hello', {}),
      ).rejects.toThrow(`Empty update (custom_id = hello)`);
    });

    it('throws error when updating nonexistent record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'existing-id',
                  testIndexedField: 'h1',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ]),
        ),
      );

      // Try to update a record that doesn't exist
      await expect(
        databaseAdapter.updateAsync(
          queryContext,
          'customIdField',
          'nonexistent-id', // This ID doesn't exist in the data store
          { stringField: 'updated' },
        ),
      ).rejects.toThrow('Empty results from database adapter update');
    });
  });

  describe('deleteAsync', () => {
    it('deletes an object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
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
          ]),
        ),
      );

      await databaseAdapter.deleteAsync(queryContext, 'customIdField', 'hello');

      expect(
        databaseAdapter.getObjectCollectionForTable(testEntityConfiguration.tableName),
      ).toHaveLength(0);
    });

    it('handles deletion of nonexistent record gracefully', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubPostgresDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        StubPostgresDatabaseAdapter.convertFieldObjectsToDataStore(
          testEntityConfiguration,
          new Map([
            [
              testEntityConfiguration.tableName,
              [
                {
                  customIdField: 'existing-id',
                  testIndexedField: 'h1',
                  intField: 3,
                  stringField: 'a',
                  dateField: new Date(),
                  nullableField: null,
                },
              ],
            ],
          ]),
        ),
      );

      // Delete a record that doesn't exist
      // Unlike update, delete doesn't throw an error when the record doesn't exist
      await databaseAdapter.deleteAsync(
        queryContext,
        'customIdField',
        'nonexistent-id', // This ID doesn't exist in the data store
      );
    });
  });

  it('supports string and number IDs', async () => {
    const queryContext = instance(mock(EntityQueryContext));
    const databaseAdapter1 = new StubPostgresDatabaseAdapter<SimpleTestFields, 'id'>(
      simpleTestEntityConfiguration,
      new Map(),
    );
    const insertedObject1 = await databaseAdapter1.insertAsync(queryContext, {});
    expect(typeof insertedObject1.id).toBe('string');

    const databaseAdapter2 = new StubPostgresDatabaseAdapter<NumberKeyFields, 'id'>(
      numberKeyEntityConfiguration,
      new Map(),
    );
    const insertedObject2 = await databaseAdapter2.insertAsync(queryContext, {});
    expect(typeof insertedObject2.id).toBe('number');

    const databaseAdapter3 = new StubPostgresDatabaseAdapter<DateIDTestFields, 'id'>(
      dateIDTestEntityConfiguration,
      new Map(),
    );
    await expect(databaseAdapter3.insertAsync(queryContext, {})).rejects.toThrow(
      'Unsupported ID type for StubPostgresDatabaseAdapter: DateField',
    );
  });
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
        StubPostgresDatabaseAdapter['compareByOrderBys'](
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
          },
        ),
      ).toEqual(expectedResult);
    });
    it('works for empty', () => {
      expect(
        StubPostgresDatabaseAdapter['compareByOrderBys'](
          [],
          {
            hello: 'test',
          },
          {
            hello: 'blah',
          },
        ),
      ).toEqual(0);
    });
  });
  describe('recursing', () => {
    expect(
      StubPostgresDatabaseAdapter['compareByOrderBys'](
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
        },
      ),
    ).toEqual(-1);
  });
});

/**
 * Returns the Date object encoded in the first 48 bits of the given UUIDv7.
 * @throws TypeError if the UUID is not version 7
 */
function getTimeFromUUIDv7(uuid: string): Date {
  if (!(validate(uuid) && version(uuid) === 7)) {
    throw new TypeError(`Invalid UUID: ${uuid}`);
  }

  // The first 48 bits = 12 hex characters of the UUID encode the timestamp in big endian
  const hexCharacters = uuid.replaceAll('-', '').split('', 12);
  const milliseconds = hexCharacters.reduce(
    (milliseconds, character) => milliseconds * 16 + parseInt(character, 16),
    0,
  );
  return new Date(milliseconds);
}
