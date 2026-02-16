import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { EntityDatabaseAdapter } from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import {
  EntityDatabaseAdapterBatchDeleteExcessiveResultError,
  EntityDatabaseAdapterBatchInsertMismatchResultError,
  EntityDatabaseAdapterBatchUpdateMismatchResultError,
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
  private readonly batchInsertResults: object[];
  private readonly batchUpdateResults: object[];
  private readonly batchDeleteCount: number;

  constructor({
    fetchResults = [],
    fetchOneResult = null,
    insertResults = [],
    updateResults = [],
    deleteCount = 0,
    batchInsertResults = [],
    batchUpdateResults = [],
    batchDeleteCount = 0,
  }: {
    fetchResults?: object[];
    fetchOneResult?: object | null;
    insertResults?: object[];
    updateResults?: object[];
    deleteCount?: number;
    batchInsertResults?: object[];
    batchUpdateResults?: object[];
    batchDeleteCount?: number;
  }) {
    super(testEntityConfiguration);
    this.fetchResults = fetchResults;
    this.fetchOneResult = fetchOneResult;
    this.insertResults = insertResults;
    this.updateResults = updateResults;
    this.deleteCount = deleteCount;
    this.batchInsertResults = batchInsertResults;
    this.batchUpdateResults = batchUpdateResults;
    this.batchDeleteCount = batchDeleteCount;
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

  protected async batchInsertInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _objects: readonly object[],
  ): Promise<object[]> {
    return this.batchInsertResults;
  }

  protected async batchUpdateInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    _ids: readonly any[],
    _object: object,
  ): Promise<object[]> {
    return this.batchUpdateResults;
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

  protected async batchDeleteInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    _ids: readonly any[],
  ): Promise<number> {
    return this.batchDeleteCount;
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
      const result = await adapter.insertAsync(queryContext, {} as any);
      expect(result).toEqual({ stringField: 'hello' });
    });

    it('throws when insert result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [] });
      await expect(adapter.insertAsync(queryContext, {} as any)).rejects.toThrow(
        EntityDatabaseAdapterEmptyInsertResultError,
      );
    });

    it('throws when insert result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        insertResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(adapter.insertAsync(queryContext, {} as any)).rejects.toThrow(
        EntityDatabaseAdapterExcessiveInsertResultError,
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
      ).rejects.toThrow(EntityDatabaseAdapterEmptyUpdateResultError);
    });

    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        updateResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(
        adapter.updateAsync(queryContext, 'customIdField', 'wat', {} as any),
      ).rejects.toThrow(EntityDatabaseAdapterExcessiveUpdateResultError);
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

  describe('batchInsertAsync', () => {
    it('transforms all objects', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        batchInsertResults: [
          { string_field: 'hello', number_field: 1 },
          { string_field: 'world', number_field: 2 },
        ],
      });
      const result = await adapter.batchInsertAsync(queryContext, [
        { stringField: 'hello', intField: 1 } as any,
        { stringField: 'world', intField: 2 } as any,
      ]);
      expect(result).toEqual([
        { stringField: 'hello', intField: 1 },
        { stringField: 'world', intField: 2 },
      ]);
    });

    it('throws when result count does not match input count', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        batchInsertResults: [{ string_field: 'hello' }],
      });
      await expect(
        adapter.batchInsertAsync(queryContext, [
          { stringField: 'hello' } as any,
          { stringField: 'world' } as any,
        ]),
      ).rejects.toThrow(EntityDatabaseAdapterBatchInsertMismatchResultError);
    });

    it('returns empty array for empty input', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({});
      const result = await adapter.batchInsertAsync(queryContext, []);
      expect(result).toEqual([]);
    });
  });

  describe('batchUpdateAsync', () => {
    it('transforms object and results', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        batchUpdateResults: [
          { custom_id: 'id1', string_field: 'updated' },
          { custom_id: 'id2', string_field: 'updated' },
        ],
      });
      const result = await adapter.batchUpdateAsync(queryContext, 'customIdField', ['id1', 'id2'], {
        stringField: 'updated',
      } as any);
      expect(result).toEqual([
        { customIdField: 'id1', stringField: 'updated' },
        { customIdField: 'id2', stringField: 'updated' },
      ]);
    });

    it('throws when result count does not match ids count', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        batchUpdateResults: [{ custom_id: 'id1', string_field: 'updated' }],
      });
      await expect(
        adapter.batchUpdateAsync(queryContext, 'customIdField', ['id1', 'id2'], {
          stringField: 'updated',
        } as any),
      ).rejects.toThrow(EntityDatabaseAdapterBatchUpdateMismatchResultError);
    });

    it('re-orders results to match input ID order', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      // Results come back in reverse order from what was requested
      const adapter = new TestEntityDatabaseAdapter({
        batchUpdateResults: [
          { custom_id: 'id2', string_field: 'second' },
          { custom_id: 'id1', string_field: 'first' },
        ],
      });
      const result = await adapter.batchUpdateAsync(queryContext, 'customIdField', ['id1', 'id2'], {
        stringField: 'updated',
      } as any);
      // Should be reordered to match input ID order
      expect(result[0]).toEqual({ customIdField: 'id1', stringField: 'first' });
      expect(result[1]).toEqual({ customIdField: 'id2', stringField: 'second' });
    });

    it('returns empty array for empty ids', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({});
      const result = await adapter.batchUpdateAsync(queryContext, 'customIdField', [], {
        stringField: 'updated',
      } as any);
      expect(result).toEqual([]);
    });
  });

  describe('batchDeleteAsync', () => {
    it('throws when deleted count exceeds ids count', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ batchDeleteCount: 3 });
      await expect(
        adapter.batchDeleteAsync(queryContext, 'customIdField', ['id1', 'id2']),
      ).rejects.toThrow(EntityDatabaseAdapterBatchDeleteExcessiveResultError);
    });

    it('returns early for empty ids', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({});
      await expect(
        adapter.batchDeleteAsync(queryContext, 'customIdField', []),
      ).resolves.toBeUndefined();
    });

    it('succeeds when deleted count matches ids count', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ batchDeleteCount: 2 });
      await expect(
        adapter.batchDeleteAsync(queryContext, 'customIdField', ['id1', 'id2']),
      ).resolves.toBeUndefined();
    });

    it('succeeds when deleted count is less than ids count', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ batchDeleteCount: 1 });
      await expect(
        adapter.batchDeleteAsync(queryContext, 'customIdField', ['id1', 'id2']),
      ).resolves.toBeUndefined();
    });
  });
});
