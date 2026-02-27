import { EntityQueryContext } from '@expo/entity';
import { type FieldTransformerMap } from '@expo/entity/internal';
import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import {
  BasePostgresEntityDatabaseAdapter,
  TableFieldMultiValueEqualityCondition,
  TableFieldSingleValueEqualityCondition,
} from '../BasePostgresEntityDatabaseAdapter';
import { testEntityConfiguration, TestFields } from './fixtures/TestEntity';

class TestEntityDatabaseAdapter extends BasePostgresEntityDatabaseAdapter<
  TestFields,
  'customIdField'
> {
  private readonly fetchResults: object[];
  private readonly fetchOneResult: object | null;
  private readonly insertResults: object[];
  private readonly updateResults: object[];
  private readonly fetchEqualityConditionResults: object[];
  private readonly fetchRawWhereResults: object[];
  private readonly fetchSQLFragmentResults: object[];
  private readonly deleteCount: number;

  constructor({
    fetchResults = [],
    fetchOneResult = null,
    insertResults = [],
    updateResults = [],
    fetchEqualityConditionResults = [],
    fetchRawWhereResults = [],
    fetchSQLFragmentResults = [],
    deleteCount = 0,
  }: {
    fetchResults?: object[];
    fetchOneResult?: object | null;
    insertResults?: object[];
    updateResults?: object[];
    fetchEqualityConditionResults?: object[];
    fetchRawWhereResults?: object[];
    fetchSQLFragmentResults?: object[];
    deleteCount?: number;
  }) {
    super(testEntityConfiguration);
    this.fetchResults = fetchResults;
    this.fetchOneResult = fetchOneResult;
    this.insertResults = insertResults;
    this.updateResults = updateResults;
    this.fetchEqualityConditionResults = fetchEqualityConditionResults;
    this.fetchRawWhereResults = fetchRawWhereResults;
    this.fetchSQLFragmentResults = fetchSQLFragmentResults;
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

  protected async fetchManyByRawWhereClauseInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _rawWhereClause: string,
    _bindings: object | any[],
  ): Promise<object[]> {
    return this.fetchRawWhereResults;
  }

  protected async fetchManyBySQLFragmentInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _sqlFragment: any,
  ): Promise<object[]> {
    return this.fetchSQLFragmentResults;
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

describe(BasePostgresEntityDatabaseAdapter, () => {
  describe('get paginationMaxPageSize', () => {
    it('returns the default paginationMaxPageSize (undefined)', () => {
      const adapter = new TestEntityDatabaseAdapter({});
      expect(adapter.paginationMaxPageSize).toBe(undefined);
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
});
