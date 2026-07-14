import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { EntityDatabaseAdapter } from '../EntityDatabaseAdapter.ts';
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
  }: {
    fetchResults?: object[];
    fetchOneResult?: object | null;
    insertResults?: object[];
    updateResults?: { updatedRowCount: number };
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

  protected async insertManyInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _objects: readonly object[],
  ): Promise<object[]> {
    return this.insertResults;
  }

  protected async updateManyInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    items: readonly { id: any; object: object }[],
  ): Promise<readonly { updatedRowCount: number }[]> {
    return items.map(() => this.updateResults);
  }

  protected async deleteManyInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _tableIdField: string,
    _ids: readonly any[],
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

  describe('insertManyAsync', () => {
    it('transforms object', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [{ string_field: 'hello' }] });
      const result = await adapter.insertManyAsync(queryContext, [{}]);
      expect(result).toEqual([{ stringField: 'hello' }]);
    });

    it('throws when insert result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ insertResults: [] });
      await expect(adapter.insertManyAsync(queryContext, [{}])).rejects.toThrow(
        EntityDatabaseAdapterEmptyInsertResultError,
      );
    });

    it('throws when insert result count greater than input count', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        insertResults: [{ string_field: 'hello' }, { string_field: 'hello2' }],
      });
      await expect(adapter.insertManyAsync(queryContext, [{}])).rejects.toThrow(
        EntityDatabaseAdapterExcessiveInsertResultError,
      );
    });
  });

  describe('updateManyAsync', () => {
    it('succeeds when one row updated per item', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: { updatedRowCount: 1 } });
      await adapter.updateManyAsync(queryContext, 'customIdField', [{ id: 'wat', object: {} }]);
    });

    it('throws when update result count zero', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ updateResults: { updatedRowCount: 0 } });
      await expect(
        adapter.updateManyAsync(queryContext, 'customIdField', [{ id: 'wat', object: {} }]),
      ).rejects.toThrow(EntityDatabaseAdapterEmptyUpdateResultError);
    });

    it('throws when update result count greater than 1', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({
        updateResults: { updatedRowCount: 2 },
      });
      await expect(
        adapter.updateManyAsync(queryContext, 'customIdField', [{ id: 'wat', object: {} }]),
      ).rejects.toThrow(EntityDatabaseAdapterExcessiveUpdateResultError);
    });
  });

  describe('deleteManyAsync', () => {
    it('throws when delete count greater than id count', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const adapter = new TestEntityDatabaseAdapter({ deleteCount: 2 });
      await expect(adapter.deleteManyAsync(queryContext, 'customIdField', ['wat'])).rejects.toThrow(
        EntityDatabaseAdapterExcessiveDeleteResultError,
      );
    });
  });
});
