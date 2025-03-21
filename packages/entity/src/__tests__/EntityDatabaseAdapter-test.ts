import { instance, mock } from 'ts-mockito';

import EntityDatabaseAdapter, {
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import { FieldTransformerMap } from '../internal/EntityFieldTransformationUtils';
import { SingleFieldHolder, SingleFieldValueHolder } from '../internal/SingleFieldHolder';
import { TestFields, testEntityConfiguration } from '../testfixtures/TestEntity';

class TestEntityDatabaseAdapter extends EntityDatabaseAdapter<TestFields> {
  private readonly fetchResults: object[];
  private readonly fetchCompositeFieldResults: object[];
  private readonly insertResults: object[];
  private readonly updateResults: object[];
  private readonly fetchEqualityConditionResults: object[];
  private readonly fetchRawWhereResults: object[];
  private readonly deleteCount: number;

  constructor({
    fetchResults = [],
    fetchCompositeFieldResults = [],
    insertResults = [],
    updateResults = [],
    fetchEqualityConditionResults = [],
    fetchRawWhereResults = [],
    deleteCount = 0,
  }: {
    fetchResults?: object[];
    fetchCompositeFieldResults?: object[];
    insertResults?: object[];
    updateResults?: object[];
    fetchEqualityConditionResults?: object[];
    fetchRawWhereResults?: object[];
    deleteCount?: number;
  }) {
    super(testEntityConfiguration);
    this.fetchResults = fetchResults;
    this.fetchCompositeFieldResults = fetchCompositeFieldResults;
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
    _tableColumns: readonly string[],
    _tableValueValues: (readonly any[])[],
  ): Promise<object[]> {
    return this.fetchResults;
  }

  protected async fetchManyWhereCompositeFieldInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableFields: string[],
    _tableFieldsValues: readonly any[][],
  ): Promise<object[]> {
    return this.fetchCompositeFieldResults;
  }

  protected async fetchManyByRawWhereClauseInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _rawWhereClause: string,
    _bindings: object | any[],
  ): Promise<object[]> {
    return this.fetchRawWhereResults;
  }

  protected async fetchManyByFieldEqualityConjunctionInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    _tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
  ): Promise<object[]> {
    return this.fetchEqualityConditionResults;
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
  ): Promise<object[]> {
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
        new SingleFieldHolder('stringField'),
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
        new SingleFieldHolder('stringField'),
        [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('wat')],
      );
      expect(result.get(new SingleFieldValueHolder('hello'))).toEqual([{ stringField: 'hello' }]);
      expect(result.get(new SingleFieldValueHolder('wat'))).toEqual([{ stringField: 'wat' }]);
    });

    it('returns map with all keys even when no results are returned', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({});
      const result = await adapter.fetchManyWhereAsync(
        queryContext,
        new SingleFieldHolder('stringField'),
        [new SingleFieldValueHolder('what'), new SingleFieldValueHolder('who')],
      );
      expect(Array.from(result.keys())).toEqual([
        new SingleFieldValueHolder('what'),
        new SingleFieldValueHolder('who'),
      ]);
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

    it('throws when insert result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [] });
      await expect(adapter.insertAsync(queryContext, {} as any)).rejects.toThrowError(
        'Empty results from database adapter insert',
      );
    });

    it('throws when insert result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        insertResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(adapter.insertAsync(queryContext, {} as any)).rejects.toThrowError(
        'Excessive results from database adapter insert',
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
        adapter.updateAsync(queryContext, 'customIdField', 'wat', {} as any),
      ).rejects.toThrowError('Empty results from database adapter update');
    });

    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        updateResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(
        adapter.updateAsync(queryContext, 'customIdField', 'wat', {} as any),
      ).rejects.toThrowError('Excessive results from database adapter update');
    });
  });

  describe('deleteAsync', () => {
    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ deleteCount: 2 });
      await expect(adapter.deleteAsync(queryContext, 'customIdField', 'wat')).rejects.toThrowError(
        'Excessive deletions from database adapter delet',
      );
    });
  });
});
