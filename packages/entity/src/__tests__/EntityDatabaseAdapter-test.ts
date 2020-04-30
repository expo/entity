import { instance, mock } from 'ts-mockito';

import EntityDatabaseAdapter, {
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import { FieldTransformerMap } from '../internal/EntityFieldTransformationUtils';
import { TestFields, testEntityConfiguration } from '../testfixtures/TestEntity';

class TestEntityDatabaseAdapter extends EntityDatabaseAdapter<TestFields> {
  private fetchResults: object[];
  private insertResults: object[];
  private updateResults: object[];
  private fetchEqualityConditionResults: object[];
  private fetchRawWhereResults: object[];

  constructor({
    fetchResults = [],
    insertResults = [],
    updateResults = [],
    fetchEqualityConditionResults = [],
    fetchRawWhereResults = [],
  }: {
    fetchResults?: object[];
    insertResults?: object[];
    updateResults?: object[];
    fetchEqualityConditionResults?: object[];
    fetchRawWhereResults?: object[];
  }) {
    super(testEntityConfiguration);
    this.fetchResults = fetchResults;
    this.insertResults = insertResults;
    this.updateResults = updateResults;
    this.fetchEqualityConditionResults = fetchEqualityConditionResults;
    this.fetchRawWhereResults = fetchRawWhereResults;
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
  ): Promise<void> {}
}

describe(EntityDatabaseAdapter, () => {
  describe('fetchManyWhereAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ fetchResults: [{ string_field: 'hello' }] });
      const result = await adapter.fetchManyWhereAsync(queryContext, 'stringField', ['hello']);
      expect(result.get('hello')).toEqual([{ stringField: 'hello' }]);
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
  });

  describe('insertAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [{ string_field: 'hello' }] });
      const result = await adapter.insertAsync(queryContext, {} as any);
      expect(result).toEqual({ stringField: 'hello' });
    });
  });

  describe('updateAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: [{ string_field: 'hello' }] });
      const result = await adapter.updateAsync(queryContext, 'customIdField', 'wat', {} as any);
      expect(result).toEqual({ stringField: 'hello' });
    });
  });
});
