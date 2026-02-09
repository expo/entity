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

import { StubDatabaseAdapter } from '../StubDatabaseAdapter';
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

  describe('insertAsync', () => {
    it('inserts a record', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
        databaseAdapter.updateAsync(queryContext, 'customIdField', 'hello', {}),
      ).rejects.toThrow(`Empty update (custom_id = hello)`);
    });
  });

  describe('deleteAsync', () => {
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

      await databaseAdapter.deleteAsync(queryContext, 'customIdField', 'hello');

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
    const insertedObject1 = await databaseAdapter1.insertAsync(queryContext, {});
    expect(typeof insertedObject1.id).toBe('string');

    const databaseAdapter2 = new StubDatabaseAdapter<NumberKeyFields, 'id'>(
      numberKeyEntityConfiguration,
      new Map(),
    );
    const insertedObject2 = await databaseAdapter2.insertAsync(queryContext, {});
    expect(typeof insertedObject2.id).toBe('number');

    const databaseAdapter3 = new StubDatabaseAdapter<DateIDTestFields, 'id'>(
      dateIDTestEntityConfiguration,
      new Map(),
    );
    await expect(databaseAdapter3.insertAsync(queryContext, {})).rejects.toThrow(
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
