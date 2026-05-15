import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { EntityConfiguration } from '../EntityConfiguration.ts';
import { EntityDatabaseAdapter } from '../EntityDatabaseAdapter.ts';
import { IntField, StringField, UUIDField, DateField } from '../EntityFields.ts';
import { EntityQueryContext } from '../EntityQueryContext.ts';
import {
  EntityDatabaseAdapterEmptyInsertResultError,
  EntityDatabaseAdapterEmptyUpdateResultError,
  EntityDatabaseAdapterExcessiveDeleteResultError,
  EntityDatabaseAdapterExcessiveInsertResultError,
  EntityDatabaseAdapterExcessiveUpdateResultError,
} from '../errors/EntityDatabaseAdapterError.ts';
import {
  CompositeFieldHolder,
  CompositeFieldValueHolder,
} from '../internal/CompositeFieldHolder.ts';
import type { FieldTransformerMap } from '../internal/EntityFieldTransformationUtils.ts';
import { SingleFieldHolder, SingleFieldValueHolder } from '../internal/SingleFieldHolder.ts';
import type { TestFields } from '../utils/__testfixtures__/TestEntity.ts';
import { testEntityConfiguration } from '../utils/__testfixtures__/TestEntity.ts';

class TestEntityDatabaseAdapter extends EntityDatabaseAdapter<TestFields, 'customIdField'> {
  private readonly fetchResults: object[];
  private readonly fetchOneResult: object | null;
  private readonly insertResults: object[];
  private readonly updateResults: { updatedRowCount: number };
  private readonly deleteCount: number;

  constructor({
    fetchResults = [],
    fetchOneResult = null,
    insertResults = [],
    updateResults = { updatedRowCount: 0 },
    deleteCount = 0,
    entityConfiguration = testEntityConfiguration,
  }: {
    fetchResults?: object[];
    fetchOneResult?: object | null;
    insertResults?: object[];
    updateResults?: { updatedRowCount: number };
    deleteCount?: number;
    entityConfiguration?: EntityConfiguration<TestFields, 'customIdField'>;
  }) {
    super(entityConfiguration);
    this.fetchResults = fetchResults;
    this.fetchOneResult = fetchOneResult;
    this.insertResults = insertResults;
    this.updateResults = updateResults;
    this.deleteCount = deleteCount;
  }

  protected getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  protected async fetchManyWhereInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableColumns: readonly string[],
    _tableTuples: (readonly any[])[],
  ): Promise<object[]> {
    return this.fetchResults;
  }

  protected async fetchOneWhereInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableColumns: readonly string[],
    _tableTuple: readonly any[],
  ): Promise<object | null> {
    return this.fetchOneResult;
  }

  protected async insertInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _object: object,
  ): Promise<object[]> {
    return this.insertResults;
  }

  protected async updateInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    _id: any,
    _object: object,
  ): Promise<{ updatedRowCount: number }> {
    return this.updateResults;
  }

  protected async deleteInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    _id: any,
  ): Promise<number> {
    return this.deleteCount;
  }
}

describe(EntityDatabaseAdapter, () => {
  describe('fetchManyWhereAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ fetchResults: [{ string_field: 'hello' }] });
      const result = await adapter.fetchManyWhereAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
        [new SingleFieldValueHolder('hello')],
      );
      expect(result.get(new SingleFieldValueHolder('hello'))).toEqual([{ stringField: 'hello' }]);
    });

    it('returns objects keyed by queried values', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: 'hello' }, { string_field: 'wat' }],
      });
      const result = await adapter.fetchManyWhereAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
        [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('wat')],
      );
      expect(result.get(new SingleFieldValueHolder('hello'))).toEqual([{ stringField: 'hello' }]);
      expect(result.get(new SingleFieldValueHolder('wat'))).toEqual([{ stringField: 'wat' }]);
    });

    it('returns objects keyed by composite queried values', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [
          { string_field: 'hello', number_field: 1 },
          { string_field: 'wat', number_field: 2 },
        ],
      });
      const result = await adapter.fetchManyWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['intField', 'stringField']),
        [
          new CompositeFieldValueHolder({ intField: 1, stringField: 'hello' }),
          new CompositeFieldValueHolder({ intField: 2, stringField: 'wat' }),
          new CompositeFieldValueHolder({ intField: 4, stringField: 'no' }),
        ],
      );
      expect(
        result.get(new CompositeFieldValueHolder({ intField: 1, stringField: 'hello' })),
      ).toEqual([{ stringField: 'hello', intField: 1 }]);
      expect(
        result.get(new CompositeFieldValueHolder({ intField: 2, stringField: 'wat' })),
      ).toEqual([{ stringField: 'wat', intField: 2 }]);
      expect(result.get(new CompositeFieldValueHolder({ intField: 4, stringField: 'no' }))).toEqual(
        [],
      );
    });

    it('returns map with all keys even when no results are returned', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({});
      const result = await adapter.fetchManyWhereAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
        [new SingleFieldValueHolder('what'), new SingleFieldValueHolder('who')],
      );
      expect(Array.from(result.keys()).map((v) => v.fieldValue)).toEqual(['what', 'who']);
    });

    it('throws when result contains invalid (null) value for key', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: null }],
      });
      await expect(
        adapter.fetchManyWhereAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
          [new SingleFieldValueHolder('hello')],
        ),
      ).rejects.toThrow(
        'One or more fields from the object is invalid for key SingleField(stringField); {"stringField":null}. This may indicate a faulty database adapter implementation.',
      );
    });

    it('throws when result contains invalid (undefined) value for key', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: undefined }],
      });
      await expect(
        adapter.fetchManyWhereAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
          [new SingleFieldValueHolder('hello')],
        ),
      ).rejects.toThrow(
        'One or more fields from the object is invalid for key SingleField(stringField); {}. This may indicate a faulty database adapter implementation.',
      );
    });

    it('throws when result contains invalid (null) value for composite key', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: 'hello', number_field: null }],
      });
      await expect(
        adapter.fetchManyWhereAsync(
          queryContext,
          new CompositeFieldHolder<TestFields, 'customIdField'>(['intField', 'stringField']),
          [new CompositeFieldValueHolder({ intField: 1, stringField: 'hello' })],
        ),
      ).rejects.toThrow(
        'One or more fields from the object is invalid for key CompositeField(intField,stringField); {"stringField":"hello","intField":null}. This may indicate a faulty database adapter implementation.',
      );
    });

    it('throws when result contains invalid (undefined) value for composite key', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: 'hello', number_field: undefined }],
      });
      await expect(
        adapter.fetchManyWhereAsync(
          queryContext,
          new CompositeFieldHolder<TestFields, 'customIdField'>(['intField', 'stringField']),
          [new CompositeFieldValueHolder({ intField: 1, stringField: 'hello' })],
        ),
      ).rejects.toThrow(
        'One or more fields from the object is invalid for key CompositeField(intField,stringField); {"stringField":"hello"}. This may indicate a faulty database adapter implementation.',
      );
    });
  });

  describe('fetchManyByFieldEqualityConjunctionAsync', () => {
    it('builds a single-value WHERE and transforms returned rows', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: 'hello', number_field: 1 }],
      });
      const result = await adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [
        { fieldName: 'stringField', fieldValue: 'hello' },
      ]);
      expect(result).toEqual([{ stringField: 'hello', intField: 1 }]);
    });

    it('applies multi-value operands as an in-memory filter on the fetched rows', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [
          { string_field: 'hello', number_field: 1 },
          { string_field: 'hello', number_field: 2 },
          { string_field: 'hello', number_field: 3 },
        ],
      });
      const result = await adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [
        { fieldName: 'stringField', fieldValue: 'hello' },
        { fieldName: 'intField', fieldValues: [1, 3] },
      ]);
      expect(result).toEqual([
        { stringField: 'hello', intField: 1 },
        { stringField: 'hello', intField: 3 },
      ]);
    });

    it('returns empty when any multi-value operand has no values', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: 'hello', number_field: 1 }],
      });
      const result = await adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [
        { fieldName: 'stringField', fieldValue: 'hello' },
        { fieldName: 'intField', fieldValues: [] },
      ]);
      expect(result).toEqual([]);
    });

    it('throws when no single-value operand is provided', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({});
      await expect(
        adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [
          { fieldName: 'intField', fieldValues: [1, 2] },
        ]),
      ).rejects.toThrow(/requires at least one single-value field equality operand/);
    });
  });

  describe('with inherent filters', () => {
    // A configuration with a single-value inherent filter and a multi-value inherent
    // filter. The single-value one becomes part of the WHERE clause (which the stub
    // adapter does not honor); the multi-value one is applied as an in-memory pass,
    // which the stub adapter does honor, letting us verify the filter actually filters.
    const testEntityConfigurationWithFilters = new EntityConfiguration<TestFields, 'customIdField'>(
      {
        idField: 'customIdField',
        tableName: 'test_entity_should_not_write_to_db',
        schema: {
          customIdField: new UUIDField({ columnName: 'custom_id', cache: true }),
          testIndexedField: new StringField({ columnName: 'test_index', cache: true }),
          stringField: new StringField({ columnName: 'string_field' }),
          intField: new IntField({ columnName: 'number_field' }),
          dateField: new DateField({ columnName: 'date_field' }),
          nullableField: new StringField({ columnName: 'nullable_field' }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
        inherentFilters: [
          { fieldName: 'stringField', fieldValue: 'in-scope' },
          { fieldName: 'testIndexedField', fieldValues: ['a', 'b'] },
        ],
      },
    );

    it("fetchManyByFieldEqualityConjunctionAsync AND's inherent filters into the operand list", async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        // Three rows that "match" the caller's WHERE — the in-memory pass on the
        // testIndexedField multi-value inherent filter strips the third.
        fetchResults: [
          { string_field: 'in-scope', test_index: 'a', number_field: 1 },
          { string_field: 'in-scope', test_index: 'b', number_field: 2 },
          { string_field: 'in-scope', test_index: 'c', number_field: 3 },
        ],
      });
      const result = await adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [
        { fieldName: 'intField', fieldValues: [1, 2, 3] },
      ]);
      expect(result.map((r) => r.intField).sort()).toEqual([1, 2]);
    });

    it('fetchManyWhereAsync with a single-field key routes through the conjunction path', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        // The conjunction default impl post-filters on the testIndexedField multi-value
        // inherent filter, stripping the row with test_index='z'.
        fetchResults: [
          { string_field: 'in-scope', test_index: 'a', number_field: 7 },
          { string_field: 'in-scope', test_index: 'z', number_field: 7 },
        ],
      });
      const result = await adapter.fetchManyWhereAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'intField'>('intField'),
        [new SingleFieldValueHolder(7)],
      );
      expect(result.get(new SingleFieldValueHolder(7))).toEqual([
        { stringField: 'in-scope', testIndexedField: 'a', intField: 7 },
      ]);
    });

    it('fetchManyWhereAsync with a composite-field key applies inherent filters in memory', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        fetchResults: [
          { string_field: 'in-scope', test_index: 'a', number_field: 1 },
          { string_field: 'out-of-scope', test_index: 'a', number_field: 1 },
          { string_field: 'in-scope', test_index: 'z', number_field: 1 },
        ],
      });
      const result = await adapter.fetchManyWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['intField', 'stringField']),
        [new CompositeFieldValueHolder({ intField: 1, stringField: 'in-scope' })],
      );
      // The composite-key path uses applyInherentFiltersInMemory, which honors BOTH the
      // single-value stringField filter and the multi-value testIndexedField filter.
      expect(
        result.get(new CompositeFieldValueHolder({ intField: 1, stringField: 'in-scope' })),
      ).toEqual([{ stringField: 'in-scope', testIndexedField: 'a', intField: 1 }]);
    });

    it('fetchOneWhereAsync with a single-field key routes through the conjunction path', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        fetchResults: [
          { string_field: 'in-scope', test_index: 'a', number_field: 42 },
          { string_field: 'in-scope', test_index: 'z', number_field: 42 },
        ],
      });
      const result = await adapter.fetchOneWhereAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'intField'>('intField'),
        new SingleFieldValueHolder(42),
      );
      // The route-through-conjunction path post-filters on testIndexedField, dropping
      // the test_index='z' row.
      expect(result).toEqual({ stringField: 'in-scope', testIndexedField: 'a', intField: 42 });
    });

    it('fetchOneWhereAsync returns null when the conjunction yields no match', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        fetchResults: [{ string_field: 'in-scope', test_index: 'z', number_field: 42 }],
      });
      const result = await adapter.fetchOneWhereAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'intField'>('intField'),
        new SingleFieldValueHolder(42),
      );
      expect(result).toBeNull();
    });

    it('fetchOneWhereAsync with a composite-field key applies inherent filters in memory', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        fetchOneResult: { string_field: 'in-scope', test_index: 'a', number_field: 1 },
      });
      const result = await adapter.fetchOneWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['intField', 'stringField']),
        new CompositeFieldValueHolder({ intField: 1, stringField: 'in-scope' }),
      );
      expect(result).toEqual({ stringField: 'in-scope', testIndexedField: 'a', intField: 1 });
    });

    it('fetchOneWhereAsync with a composite-field key returns null when the single-value inherent filter rejects the row', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        fetchOneResult: { string_field: 'out-of-scope', test_index: 'a', number_field: 1 },
      });
      const result = await adapter.fetchOneWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['intField', 'stringField']),
        new CompositeFieldValueHolder({ intField: 1, stringField: 'out-of-scope' }),
      );
      expect(result).toBeNull();
    });

    it('fetchOneWhereAsync with a composite-field key returns null when the multi-value inherent filter rejects the row', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        entityConfiguration: testEntityConfigurationWithFilters,
        fetchOneResult: { string_field: 'in-scope', test_index: 'z', number_field: 1 },
      });
      const result = await adapter.fetchOneWhereAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>(['intField', 'stringField']),
        new CompositeFieldValueHolder({ intField: 1, stringField: 'in-scope' }),
      );
      expect(result).toBeNull();
    });
  });

  describe('insertAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [{ string_field: 'hello' }] });
      const result = await adapter.insertAsync(queryContext, {});
      expect(result).toEqual({ stringField: 'hello' });
    });

    it('throws when insert result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [] });
      await expect(adapter.insertAsync(queryContext, {})).rejects.toThrow(
        EntityDatabaseAdapterEmptyInsertResultError,
      );
    });

    it('throws when insert result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        insertResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(adapter.insertAsync(queryContext, {})).rejects.toThrow(
        EntityDatabaseAdapterExcessiveInsertResultError,
      );
    });
  });

  describe('updateAsync', () => {
    it('succeeds when one row updated', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: { updatedRowCount: 1 } });
      await adapter.updateAsync(queryContext, 'customIdField', 'wat', {});
    });

    it('throws when update result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: { updatedRowCount: 0 } });
      await expect(adapter.updateAsync(queryContext, 'customIdField', 'wat', {})).rejects.toThrow(
        EntityDatabaseAdapterEmptyUpdateResultError,
      );
    });

    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        updateResults: { updatedRowCount: 2 },
      });
      await expect(adapter.updateAsync(queryContext, 'customIdField', 'wat', {})).rejects.toThrow(
        EntityDatabaseAdapterExcessiveUpdateResultError,
      );
    });
  });

  describe('deleteAsync', () => {
    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ deleteCount: 2 });
      await expect(adapter.deleteAsync(queryContext, 'customIdField', 'wat')).rejects.toThrow(
        EntityDatabaseAdapterExcessiveDeleteResultError,
      );
    });
  });
});
