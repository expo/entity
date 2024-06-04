import invariant from 'invariant';

import ComposedEntityCacheAdapter from '../ComposedEntityCacheAdapter';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import IEntityCacheAdapter from '../IEntityCacheAdapter';
import { CacheLoadResult, CacheStatus } from '../internal/ReadThroughEntityCache';

type BlahFields = {
  id: string;
};

const entityConfiguration = new EntityConfiguration<BlahFields>({
  idField: 'id',
  tableName: 'blah',
  schema: {
    id: new UUIDField({ columnName: 'id', cache: true }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'local-memory-and-redis',
});

export const DOES_NOT_EXIST_LOCAL_MEMORY_CACHE = Symbol('doesNotExist');
type LocalMemoryCacheValue<TFields> = Readonly<TFields> | typeof DOES_NOT_EXIST_LOCAL_MEMORY_CACHE;

class TestLocalCacheAdapter<TFields extends Record<string, any>>
  implements IEntityCacheAdapter<TFields>
{
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly cache: Map<string, LocalMemoryCacheValue<TFields>>
  ) {}

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const localMemoryCacheKeyToFieldValueMapping = new Map(
      fieldValues.map((fieldValue) => [this.makeCacheKey(fieldName, fieldValue), fieldValue])
    );
    const cacheResults = new Map<NonNullable<TFields[N]>, CacheLoadResult<TFields>>();
    for (const [cacheKey, fieldValue] of localMemoryCacheKeyToFieldValueMapping) {
      const cacheResult = this.cache.get(cacheKey);
      if (cacheResult === DOES_NOT_EXIST_LOCAL_MEMORY_CACHE) {
        cacheResults.set(fieldValue, {
          status: CacheStatus.NEGATIVE,
        });
      } else if (cacheResult) {
        cacheResults.set(fieldValue, {
          status: CacheStatus.HIT,
          item: cacheResult,
        });
      } else {
        cacheResults.set(fieldValue, {
          status: CacheStatus.MISS,
        });
      }
    }

    return cacheResults;
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void> {
    for (const [fieldValue, item] of objectMap) {
      const cacheKey = this.makeCacheKey(fieldName, fieldValue);
      this.cache.set(cacheKey, item);
    }
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    for (const fieldValue of fieldValues) {
      const cacheKey = this.makeCacheKey(fieldName, fieldValue);
      this.cache.set(cacheKey, DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);
    }
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    for (const fieldValue of fieldValues) {
      const cacheKey = this.makeCacheKey(fieldName, fieldValue);
      this.cache.delete(cacheKey);
    }
  }

  private makeCacheKey<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): string {
    const columnName = this.entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
    invariant(columnName, `database field mapping missing for ${String(fieldName)}`);
    const parts = [
      this.entityConfiguration.tableName,
      `${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue),
    ];
    const delimiter = ':';
    const escapedParts = parts.map((part) =>
      part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
    );
    return escapedParts.join(delimiter);
  }
}

function makeTestCacheAdapters(): {
  primaryCache: Map<string, LocalMemoryCacheValue<BlahFields>>;
  primaryCacheAdapter: TestLocalCacheAdapter<BlahFields>;
  fallbackCache: Map<string, LocalMemoryCacheValue<BlahFields>>;
  fallbackCacheAdapter: TestLocalCacheAdapter<BlahFields>;
  cacheAdapter: ComposedEntityCacheAdapter<BlahFields>;
} {
  const primaryCache = new Map();
  const primaryCacheAdapter = new TestLocalCacheAdapter(entityConfiguration, primaryCache);

  const fallbackCache = new Map();
  const fallbackCacheAdapter = new TestLocalCacheAdapter(entityConfiguration, fallbackCache);

  const cacheAdapter = new ComposedEntityCacheAdapter([primaryCacheAdapter, fallbackCacheAdapter]);

  return {
    primaryCache,
    primaryCacheAdapter,
    fallbackCache,
    fallbackCacheAdapter,
    cacheAdapter,
  };
}

describe(ComposedEntityCacheAdapter, () => {
  describe('loadManyAsync', () => {
    it('returns primary results when populated', async () => {
      const { primaryCacheAdapter, cacheAdapter } = makeTestCacheAdapters();

      const cacheHits = new Map<string, Readonly<BlahFields>>([['test-id-1', { id: 'test-id-1' }]]);
      await primaryCacheAdapter.cacheManyAsync('id', cacheHits);
      await primaryCacheAdapter.cacheDBMissesAsync('id', ['test-id-2']);

      const results = await cacheAdapter.loadManyAsync('id', [
        'test-id-1',
        'test-id-2',
        'test-id-3',
      ]);

      expect(results.get('test-id-1')).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(results.get('test-id-2')).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(results.get('test-id-3')).toMatchObject({ status: CacheStatus.MISS });
      expect(results.size).toBe(3);
    });

    it('returns fallback adapter results primary is empty', async () => {
      const { fallbackCacheAdapter, cacheAdapter } = makeTestCacheAdapters();

      const cacheHits = new Map<string, Readonly<BlahFields>>([['test-id-1', { id: 'test-id-1' }]]);
      await fallbackCacheAdapter.cacheManyAsync('id', cacheHits);
      await fallbackCacheAdapter.cacheDBMissesAsync('id', ['test-id-2']);

      const results = await cacheAdapter.loadManyAsync('id', [
        'test-id-1',
        'test-id-2',
        'test-id-3',
      ]);

      expect(results.get('test-id-1')).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(results.get('test-id-2')).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(results.get('test-id-3')).toMatchObject({ status: CacheStatus.MISS });
      expect(results.size).toBe(3);
    });

    it('populates primary adapter with fallback adapter results', async () => {
      const { primaryCacheAdapter, fallbackCacheAdapter, cacheAdapter } = makeTestCacheAdapters();

      const cacheHits = new Map<string, Readonly<BlahFields>>([['test-id-1', { id: 'test-id-1' }]]);
      await fallbackCacheAdapter.cacheManyAsync('id', cacheHits);
      await fallbackCacheAdapter.cacheDBMissesAsync('id', ['test-id-2']);

      // should populate primary cache with fallback cache results
      await cacheAdapter.loadManyAsync('id', ['test-id-1', 'test-id-2', 'test-id-3']);

      const primaryResults = await primaryCacheAdapter.loadManyAsync('id', [
        'test-id-1',
        'test-id-2',
        'test-id-3',
      ]);

      expect(primaryResults.get('test-id-1')).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(primaryResults.get('test-id-2')).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(primaryResults.get('test-id-3')).toMatchObject({ status: CacheStatus.MISS });
      expect(primaryResults.size).toBe(3);

      // ensure that populating the primary cache doesn't change the output
      const composedResults = await cacheAdapter.loadManyAsync('id', [
        'test-id-1',
        'test-id-2',
        'test-id-3',
      ]);
      expect(composedResults.get('test-id-1')).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(composedResults.get('test-id-2')).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(composedResults.get('test-id-3')).toMatchObject({ status: CacheStatus.MISS });
      expect(composedResults.size).toBe(3);
    });

    it('returns empty map when passed empty array of fieldValues', async () => {
      const { cacheAdapter } = makeTestCacheAdapters();
      const results = await cacheAdapter.loadManyAsync('id', []);
      expect(results).toEqual(new Map());
    });

    it('handles 0 cache adapter compose case', async () => {
      const cacheAdapter = new ComposedEntityCacheAdapter<any>([]);
      const results = await cacheAdapter.loadManyAsync('id', []);
      expect(results).toEqual(new Map());
    });
  });

  describe('cacheManyAsync', () => {
    it('correctly caches all objects', async () => {
      const {
        primaryCache,
        primaryCacheAdapter,
        fallbackCache,
        fallbackCacheAdapter,
        cacheAdapter,
      } = makeTestCacheAdapters();

      await cacheAdapter.cacheManyAsync('id', new Map([['test-id-1', { id: 'test-id-1' }]]));

      const primaryLocalMemoryCacheKey = primaryCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(primaryCache.get(primaryLocalMemoryCacheKey)).toMatchObject({
        id: 'test-id-1',
      });

      const fallbackLocalMemoryCacheKey = fallbackCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(fallbackCache.get(fallbackLocalMemoryCacheKey)).toMatchObject({
        id: 'test-id-1',
      });
    });
  });

  describe('cacheDBMissesAsync', () => {
    it('correctly caches misses', async () => {
      const {
        primaryCache,
        primaryCacheAdapter,
        fallbackCache,
        fallbackCacheAdapter,
        cacheAdapter,
      } = makeTestCacheAdapters();

      await cacheAdapter.cacheDBMissesAsync('id', ['test-id-1']);

      const primaryLocalMemoryCacheKey = primaryCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(primaryCache.get(primaryLocalMemoryCacheKey)).toBe(DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);

      const fallbackLocalMemoryCacheKey = fallbackCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(fallbackCache.get(fallbackLocalMemoryCacheKey)).toBe(
        DOES_NOT_EXIST_LOCAL_MEMORY_CACHE
      );
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly', async () => {
      const {
        primaryCache,
        primaryCacheAdapter,
        fallbackCache,
        fallbackCacheAdapter,
        cacheAdapter,
      } = makeTestCacheAdapters();

      const cacheHits = new Map<string, Readonly<BlahFields>>([['test-id-1', { id: 'test-id-1' }]]);
      await primaryCacheAdapter.cacheManyAsync('id', cacheHits);
      await primaryCacheAdapter.cacheDBMissesAsync('id', ['test-id-2']);
      await fallbackCacheAdapter.cacheManyAsync('id', cacheHits);
      await fallbackCacheAdapter.cacheDBMissesAsync('id', ['test-id-2']);

      await cacheAdapter.invalidateManyAsync('id', ['test-id-1', 'test-id-2']);

      const primaryLocalMemoryCacheKey1 = primaryCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(primaryCache.get(primaryLocalMemoryCacheKey1)).toBe(undefined);
      const primaryLocalMemoryCacheKey2 = primaryCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(primaryCache.get(primaryLocalMemoryCacheKey2)).toBe(undefined);

      const fallbackLocalMemoryCacheKey1 = fallbackCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(fallbackCache.get(fallbackLocalMemoryCacheKey1)).toBe(undefined);
      const fallbackLocalMemoryCacheKey2 = fallbackCacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(fallbackCache.get(fallbackLocalMemoryCacheKey2)).toBe(undefined);
    });

    it('returns when passed empty array of fieldValues', async () => {
      const { cacheAdapter } = makeTestCacheAdapters();

      await cacheAdapter.invalidateManyAsync('id', []);
    });
  });
});
