import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { EntityDatabaseAdapter } from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import {
  EntityDatabaseAdapterEmptyInsertResultError,
  EntityDatabaseAdapterEmptyUpdateResultError,
  EntityDatabaseAdapterExcessiveDeleteResultError,
  EntityDatabaseAdapterExcessiveInsertResultError,
  EntityDatabaseAdapterExcessiveUpdateResultError,
} from '../errors/EntityDatabaseAdapterError';
import { CompositeFieldHolder, CompositeFieldValueHolder } from '../internal/CompositeFieldHolder';
import { FieldTransformerMap } from '../internal/EntityFieldTransformationUtils';
import { SingleFieldHolder, SingleFieldValueHolder } from '../internal/SingleFieldHolder';
import { TestFields, testEntityConfiguration } from '../utils/__testfixtures__/TestEntity';

class TestEntityDatabaseAdapter extends EntityDatabaseAdapter<TestFields, 'customIdField'> {
  private readonly fetchResults: object[];
  private readonly fetchOneResult: object | null;
  private readonly insertResults: object[];
  private readonly updateResults: object[];
  private readonly deleteCount: number;

  constructor({
    fetchResults = [],
    fetchOneResult = null,
    insertResults = [],
    updateResults = [],
    deleteCount = 0,
  }: {
    fetchResults?: object[];
    fetchOneResult?: object | null;
    insertResults?: object[];
    updateResults?: object[];
    deleteCount?: number;
  }) {
    super(testEntityConfiguration);
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
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: [{ string_field: 'hello' }] });
      const result = await adapter.updateAsync(queryContext, 'customIdField', 'wat', {});
      expect(result).toEqual({ stringField: 'hello' });
    });

    it('throws when update result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: [] });
      await expect(adapter.updateAsync(queryContext, 'customIdField', 'wat', {})).rejects.toThrow(
        EntityDatabaseAdapterEmptyUpdateResultError,
      );
    });

    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        updateResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
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
