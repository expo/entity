import {
  CompositeFieldHolder,
  CompositeFieldValueHolder,
  EntityQueryContext,
  SingleFieldHolder,
  SingleFieldValueHolder,
} from '@expo/entity';
import { describe, expect, it, jest } from '@jest/globals';
import { instance, mock } from 'ts-mockito';
import { validate, version } from 'uuid';

import { StubDatabaseAdapter } from '../StubDatabaseAdapter.ts';
import type { DateIDTestFields } from '../__testfixtures__/DateIDTestEntity.ts';
import { dateIDTestEntityConfiguration } from '../__testfixtures__/DateIDTestEntity.ts';
import type { SimpleTestFields } from '../__testfixtures__/SimpleTestEntity.ts';
import { simpleTestEntityConfiguration } from '../__testfixtures__/SimpleTestEntity.ts';
import type { TestFields } from '../__testfixtures__/TestEntity.ts';
import { testEntityConfiguration } from '../__testfixtures__/TestEntity.ts';
import type { NumberKeyFields } from '../__testfixtures__/TestEntityNumberKey.ts';
import { numberKeyEntityConfiguration } from '../__testfixtures__/TestEntityNumberKey.ts';

// uuid keeps state internally for v7 generation, so we fix the time for all tests for consistent test results
const expectedTime = new Date('2024-06-03T20:16:33.761Z');
jest.useFakeTimers({
  now: expectedTime,
});

describe(StubDatabaseAdapter, () => {
  describe('fetchManyWhereAsync', () => {
    it('fetches many where single', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
  });

  describe('fetchOneWhereAsync', () => {
    it('fetches one where single', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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

  describe('insertManyAsync', () => {
    it('inserts a record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        new Map(),
      );
      const result = await databaseAdapter.insertManyAsync(queryContext, [
        {
          stringField: 'hello',
        },
      ]);
      expect(result[0]).toMatchObject({
        stringField: 'hello',
      });

      expect(
        databaseAdapter.getObjectCollectionForTable(testEntityConfiguration.tableName),
      ).toHaveLength(1);
    });

    it('inserts a record with valid v7 id', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        new Map(),
      );
      const result = await databaseAdapter.insertManyAsync(queryContext, [
        {
          stringField: 'hello',
        },
      ]);

      const ts = getTimeFromUUIDv7(result[0]!.customIdField);
      expect(ts).toEqual(expectedTime);
    });
  });

  describe('updateManyAsync', () => {
    it('updates a record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
          ]),
        ),
      );
      await databaseAdapter.updateManyAsync(queryContext, 'customIdField', [
        { id: 'hello', object: { stringField: 'b' } },
      ]);
    });

    it('throws error when empty update to match common DBMS behavior', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
          ]),
        ),
      );
      await expect(
        databaseAdapter.updateManyAsync(queryContext, 'customIdField', [
          { id: 'hello', object: {} },
        ]),
      ).rejects.toThrow(`Empty update (custom_id = hello)`);
    });
  });

  describe('deleteManyAsync', () => {
    it('deletes an object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
          ]),
        ),
      );

      await databaseAdapter.deleteManyAsync(queryContext, 'customIdField', ['hello']);

      expect(
        databaseAdapter.getObjectCollectionForTable(testEntityConfiguration.tableName),
      ).toHaveLength(0);
    });
  });

  it('supports string and number IDs', async () => {
    const queryContext = instance(mock(EntityQueryContext));
    const databaseAdapter1 = new StubDatabaseAdapter<SimpleTestFields, 'id'>(
      simpleTestEntityConfiguration,
      new Map(),
    );
    const insertedObjects1 = await databaseAdapter1.insertManyAsync(queryContext, [{}]);
    expect(typeof insertedObjects1[0]!.id).toBe('string');

    const databaseAdapter2 = new StubDatabaseAdapter<NumberKeyFields, 'id'>(
      numberKeyEntityConfiguration,
      new Map(),
    );
    const insertedObjects2 = await databaseAdapter2.insertManyAsync(queryContext, [{}]);
    expect(typeof insertedObjects2[0]!.id).toBe('number');

    const databaseAdapter3 = new StubDatabaseAdapter<DateIDTestFields, 'id'>(
      dateIDTestEntityConfiguration,
      new Map(),
    );
    await expect(databaseAdapter3.insertManyAsync(queryContext, [{}])).rejects.toThrow(
      'Unsupported ID type for StubDatabaseAdapter: DateField',
    );
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
