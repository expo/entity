import { instance, mock } from 'ts-mockito';

import EntityConfiguration from '../EntityConfiguration';
import EntityDatabaseAdapter, {
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
} from '../EntityDatabaseAdapter';
import { UUIDField, StringField, NumberField, DateField } from '../EntityFields';
import { EntityQueryContext } from '../EntityQueryContext';
import { FieldTransformerMap } from '../internal/EntityFieldTransformationUtils';
import { TestFields, testEntityConfiguration } from '../testfixtures/TestEntity';

class TestEntityDatabaseAdapter extends EntityDatabaseAdapter<TestFields> {
  private fetchResults: object[];
  private insertResults: object[];
  private updateResults: object[];
  private fetchEqualityConditionResults: object[];
  private fetchRawWhereResults: object[];
  private deleteCount: number;

  constructor(
    {
      fetchResults = [],
      insertResults = [],
      updateResults = [],
      fetchEqualityConditionResults = [],
      fetchRawWhereResults = [],
      deleteCount = 0,
    }: {
      fetchResults?: object[];
      insertResults?: object[];
      updateResults?: object[];
      fetchEqualityConditionResults?: object[];
      fetchRawWhereResults?: object[];
      deleteCount?: number;
    },
    entityConfiguration?: EntityConfiguration<TestFields>
  ) {
    super(entityConfiguration ?? testEntityConfiguration);
    this.fetchResults = fetchResults;
    this.insertResults = insertResults;
    this.updateResults = updateResults;
    this.fetchEqualityConditionResults = fetchEqualityConditionResults;
    this.fetchRawWhereResults = fetchRawWhereResults;
    this.deleteCount = deleteCount;
  }

  protected getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  protected async fetchManyWhereInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableField: string,
    _tableValues: readonly any[]
  ): Promise<object[]> {
    return this.fetchResults;
  }

  protected async fetchManyByRawWhereClauseInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _rawWhereClause: string,
    _bindings: object | any[]
  ): Promise<object[]> {
    return this.fetchRawWhereResults;
  }

  protected async fetchManyByFieldEqualityConjunctionInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    _tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[]
  ): Promise<object[]> {
    return this.fetchEqualityConditionResults;
  }

  protected async insertInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _object: object
  ): Promise<object[]> {
    return this.insertResults;
  }

  protected async updateInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    _id: any,
    _object: object
  ): Promise<object[]> {
    return this.updateResults;
  }

  protected async deleteInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    _id: any
  ): Promise<number> {
    return this.deleteCount;
  }
}

describe(EntityDatabaseAdapter, () => {
  describe('fetchManyWhereAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ fetchResults: [{ string_field: 'hello' }] });
      const result = await adapter.fetchManyWhereAsync(queryContext, 'stringField', ['hello']);
      expect(result.get('hello')).toEqual([{ stringField: 'hello' }]);
    });

    it('filters invalid objects', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const entityConfiguration = new EntityConfiguration<TestFields>({
        idField: 'customIdField',
        tableName: 'test_entity_should_not_write_to_db',
        schema: {
          customIdField: new UUIDField({
            columnName: 'custom_id',
          }),
          testIndexedField: new StringField({
            columnName: 'test_index',
            cache: true,
          }),
          stringField: new StringField({
            columnName: 'string_field',
            validator: {
              read: (value) => value !== 'hello',
            },
          }),
          numberField: new NumberField({
            columnName: 'number_field',
          }),
          dateField: new DateField({
            columnName: 'date_field',
          }),
        },
      });

      const adapter = new TestEntityDatabaseAdapter(
        { fetchResults: [{ string_field: 'hello' }] },
        entityConfiguration
      );
      const result = await adapter.fetchManyWhereAsync(queryContext, 'stringField', ['hello']);
      expect(result.get('hello')).toHaveLength(0);
    });

    it('returns objects keyed by queried values', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchResults: [{ string_field: 'hello' }, { string_field: 'wat' }],
      });
      const result = await adapter.fetchManyWhereAsync(queryContext, 'stringField', [
        'hello',
        'wat',
      ]);
      expect(result.get('hello')).toEqual([{ stringField: 'hello' }]);
      expect(result.get('wat')).toEqual([{ stringField: 'wat' }]);
    });

    it('returns map with all keys even when no results are returned', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({});
      const result = await adapter.fetchManyWhereAsync(queryContext, 'stringField', [
        'what',
        'who',
      ]);
      expect(Array.from(result.keys())).toEqual(['what', 'who']);
    });
  });

  describe('fetchManyByFieldEqualityConjunction', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchEqualityConditionResults: [{ string_field: 'hello' }],
      });
      const results = await adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [], {});
      expect(results).toEqual([{ stringField: 'hello' }]);
    });

    it('filters invalid objects', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const entityConfiguration = new EntityConfiguration<TestFields>({
        idField: 'customIdField',
        tableName: 'test_entity_should_not_write_to_db',
        schema: {
          customIdField: new UUIDField({
            columnName: 'custom_id',
          }),
          testIndexedField: new StringField({
            columnName: 'test_index',
            cache: true,
          }),
          stringField: new StringField({
            columnName: 'string_field',
            validator: {
              read: (value) => value !== 'hello',
            },
          }),
          numberField: new NumberField({
            columnName: 'number_field',
          }),
          dateField: new DateField({
            columnName: 'date_field',
          }),
        },
      });

      const adapter = new TestEntityDatabaseAdapter(
        { fetchEqualityConditionResults: [{ string_field: 'hello' }] },
        entityConfiguration
      );
      const results = await adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [], {});
      expect(results).toEqual([]);
    });
  });

  describe('fetchManyWithRawWhereClause', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        fetchRawWhereResults: [{ string_field: 'hello' }],
      });
      const results = await adapter.fetchManyByRawWhereClauseAsync(queryContext, 'hello', [], {});
      expect(results).toEqual([{ stringField: 'hello' }]);
    });

    it('filters invalid objects', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const entityConfiguration = new EntityConfiguration<TestFields>({
        idField: 'customIdField',
        tableName: 'test_entity_should_not_write_to_db',
        schema: {
          customIdField: new UUIDField({
            columnName: 'custom_id',
          }),
          testIndexedField: new StringField({
            columnName: 'test_index',
            cache: true,
          }),
          stringField: new StringField({
            columnName: 'string_field',
            validator: {
              read: (value) => value !== 'hello',
            },
          }),
          numberField: new NumberField({
            columnName: 'number_field',
          }),
          dateField: new DateField({
            columnName: 'date_field',
          }),
        },
      });

      const adapter = new TestEntityDatabaseAdapter(
        { fetchRawWhereResults: [{ string_field: 'hello' }] },
        entityConfiguration
      );
      const results = await adapter.fetchManyByFieldEqualityConjunctionAsync(queryContext, [], {});
      expect(results).toEqual([]);
    });
  });

  describe('insertAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [{ string_field: 'hello' }] });
      const result = await adapter.insertAsync(queryContext, {} as any);
      expect(result).toEqual({ stringField: 'hello' });
    });

    it('throws when insert result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [] });
      await expect(adapter.insertAsync(queryContext, {} as any)).rejects.toThrowError(
        'Empty results from database adapter insert'
      );
    });

    it('throws when insert result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        insertResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(adapter.insertAsync(queryContext, {} as any)).rejects.toThrowError(
        'Excessive results from database adapter insert'
      );
    });
  });

  describe('updateAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: [{ string_field: 'hello' }] });
      const result = await adapter.updateAsync(queryContext, 'customIdField', 'wat', {} as any);
      expect(result).toEqual({ stringField: 'hello' });
    });

    it('throws when update result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: [] });
      await expect(
        adapter.updateAsync(queryContext, 'customIdField', 'wat', {} as any)
      ).rejects.toThrowError('Empty results from database adapter update');
    });

    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        updateResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(
        adapter.updateAsync(queryContext, 'customIdField', 'wat', {} as any)
      ).rejects.toThrowError('Excessive results from database adapter update');
    });
  });

  describe('deleteAsync', () => {
    it('throws when update result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ deleteCount: 0 });
      await expect(adapter.deleteAsync(queryContext, 'customIdField', 'wat')).rejects.toThrowError(
        'No deletions from database adapter delet'
      );
    });

    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ deleteCount: 2 });
      await expect(adapter.deleteAsync(queryContext, 'customIdField', 'wat')).rejects.toThrowError(
        'Excessive deletions from database adapter delet'
      );
    });
  });
});
