import { describe, expect, it } from '@jest/globals';

import ComposedEntityCacheAdapter from '../ComposedEntityCacheAdapter';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import IEntityCacheAdapter from '../IEntityCacheAdapter';
import { IEntityLoadKey, IEntityLoadValue } from '../internal/EntityLoadInterfaces';
import { CacheLoadResult, CacheStatus } from '../internal/ReadThroughEntityCache';
import { SingleFieldHolder, SingleFieldValueHolder } from '../internal/SingleFieldHolder';

type BlahFields = {
  id: string;
};

const entityConfiguration = new EntityConfiguration<BlahFields, 'id'>({
  idField: 'id',
  tableName: 'blah',
  schema: {
    id: new UUIDField({ columnName: 'id', cache: true }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'local-memory-and-redis',
});

export const DOES_NOT_EXIST_LOCAL_MEMORY_CACHE = Symbol('doesNotExist');
type LocalMemoryCacheValue<TFields extends Record<string, any>> =
  | Readonly<TFields>
  | typeof DOES_NOT_EXIST_LOCAL_MEMORY_CACHE;

class TestLocalCacheAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>
  implements IEntityCacheAdapter<TFields, TIDField>
{
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly cache: Map<string, LocalMemoryCacheValue<TFields>>,
  ) {}

  public async loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>> {
    const localMemoryCacheKeyToFieldValueMapping = new Map(
      values.map((value) => [this.makeCacheKey(key, value), value]),
    );
    const cacheResults = key.vendNewLoadValueMap<CacheLoadResult<TFields>>();
    for (const [cacheKey, value] of localMemoryCacheKeyToFieldValueMapping) {
      const cacheResult = this.cache.get(cacheKey);
      if (cacheResult === DOES_NOT_EXIST_LOCAL_MEMORY_CACHE) {
        cacheResults.set(value, {
          status: CacheStatus.NEGATIVE,
        });
      } else if (cacheResult) {
        cacheResults.set(value, {
          status: CacheStatus.HIT,
          item: cacheResult,
        });
      } else {
        cacheResults.set(value, {
          status: CacheStatus.MISS,
        });
      }
    }

    return cacheResults;
  }

  public async cacheManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>): Promise<void> {
    for (const [value, item] of objectMap) {
      const cacheKey = this.makeCacheKey(key, value);
      this.cache.set(cacheKey, item);
    }
  }

  public async cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    for (const value of values) {
      const cacheKey = this.makeCacheKey(key, value);
      this.cache.set(cacheKey, DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);
    }
  }

  public async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    for (const value of values) {
      const cacheKey = this.makeCacheKey(key, value);
      this.cache.delete(cacheKey);
    }
  }

  private makeCacheKey<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue): string {
    const cacheKeyType = key.getLoadMethodType();
    const parts = key.createCacheKeyPartsForLoadValue(this.entityConfiguration, value);
    const delimiter = ':';
    const escapedParts = [
      this.entityConfiguration.tableName,
      cacheKeyType,
      `${this.entityConfiguration.cacheKeyVersion}`,
      ...parts,
    ].map((part) => part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`));
    return escapedParts.join(delimiter);
  }
}

function makeTestCacheAdapters(): {
  primaryCache: Map<string, LocalMemoryCacheValue<BlahFields>>;
  primaryCacheAdapter: TestLocalCacheAdapter<BlahFields, 'id'>;
  fallbackCache: Map<string, LocalMemoryCacheValue<BlahFields>>;
  fallbackCacheAdapter: TestLocalCacheAdapter<BlahFields, 'id'>;
  cacheAdapter: ComposedEntityCacheAdapter<BlahFields, 'id'>;
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

      const cacheHits = new Map<SingleFieldValueHolder<BlahFields, 'id'>, Readonly<BlahFields>>([
        [new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }],
      ]);
      await primaryCacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        cacheHits,
      );
      await primaryCacheAdapter.cacheDBMissesAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [new SingleFieldValueHolder('test-id-2')],
      );

      const results = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [
          new SingleFieldValueHolder('test-id-1'),
          new SingleFieldValueHolder('test-id-2'),
          new SingleFieldValueHolder('test-id-3'),
        ],
      );

      expect(results.get(new SingleFieldValueHolder('test-id-1'))).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(results.get(new SingleFieldValueHolder('test-id-2'))).toMatchObject({
        status: CacheStatus.NEGATIVE,
      });
      expect(results.get(new SingleFieldValueHolder('test-id-3'))).toMatchObject({
        status: CacheStatus.MISS,
      });
      expect(results.size).toBe(3);
    });

    it('returns fallback adapter results primary is empty', async () => {
      const { fallbackCacheAdapter, cacheAdapter } = makeTestCacheAdapters();

      const cacheHits = new Map<SingleFieldValueHolder<BlahFields, 'id'>, Readonly<BlahFields>>([
        [new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }],
      ]);
      await fallbackCacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        cacheHits,
      );
      await fallbackCacheAdapter.cacheDBMissesAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [new SingleFieldValueHolder('test-id-2')],
      );

      const results = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [
          new SingleFieldValueHolder('test-id-1'),
          new SingleFieldValueHolder('test-id-2'),
          new SingleFieldValueHolder('test-id-3'),
        ],
      );

      expect(results.get(new SingleFieldValueHolder('test-id-1'))).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(results.get(new SingleFieldValueHolder('test-id-2'))).toMatchObject({
        status: CacheStatus.NEGATIVE,
      });
      expect(results.get(new SingleFieldValueHolder('test-id-3'))).toMatchObject({
        status: CacheStatus.MISS,
      });
      expect(results.size).toBe(3);
    });

    it('populates primary adapter with fallback adapter results', async () => {
      const { primaryCacheAdapter, fallbackCacheAdapter, cacheAdapter } = makeTestCacheAdapters();

      const cacheHits = new Map<SingleFieldValueHolder<BlahFields, 'id'>, Readonly<BlahFields>>([
        [new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }],
      ]);
      await fallbackCacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        cacheHits,
      );
      await fallbackCacheAdapter.cacheDBMissesAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [new SingleFieldValueHolder('test-id-2')],
      );

      // should populate primary cache with fallback cache results
      await cacheAdapter.loadManyAsync(new SingleFieldHolder<BlahFields, 'id', 'id'>('id'), [
        new SingleFieldValueHolder('test-id-1'),
        new SingleFieldValueHolder('test-id-2'),
        new SingleFieldValueHolder('test-id-3'),
      ]);

      const primaryResults = await primaryCacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [
          new SingleFieldValueHolder('test-id-1'),
          new SingleFieldValueHolder('test-id-2'),
          new SingleFieldValueHolder('test-id-3'),
        ],
      );

      expect(primaryResults.get(new SingleFieldValueHolder('test-id-1'))).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(primaryResults.get(new SingleFieldValueHolder('test-id-2'))).toMatchObject({
        status: CacheStatus.NEGATIVE,
      });
      expect(primaryResults.get(new SingleFieldValueHolder('test-id-3'))).toMatchObject({
        status: CacheStatus.MISS,
      });
      expect(primaryResults.size).toBe(3);

      // ensure that populating the primary cache doesn't change the output
      const composedResults = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [
          new SingleFieldValueHolder('test-id-1'),
          new SingleFieldValueHolder('test-id-2'),
          new SingleFieldValueHolder('test-id-3'),
        ],
      );
      expect(composedResults.get(new SingleFieldValueHolder('test-id-1'))).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'test-id-1' },
      });
      expect(composedResults.get(new SingleFieldValueHolder('test-id-2'))).toMatchObject({
        status: CacheStatus.NEGATIVE,
      });
      expect(composedResults.get(new SingleFieldValueHolder('test-id-3'))).toMatchObject({
        status: CacheStatus.MISS,
      });
      expect(composedResults.size).toBe(3);
    });

    it('returns empty map when passed empty array of values', async () => {
      const { cacheAdapter } = makeTestCacheAdapters();
      const results = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as any,
      );
      expect(results.size).toBe(0);
    });

    it('handles 0 cache adapter compose case', async () => {
      const cacheAdapter = new ComposedEntityCacheAdapter<BlahFields, 'id'>([]);
      const results = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as any,
      );
      expect(results.size).toBe(0);
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

      await cacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new Map([[new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }]]),
      );

      const primaryLocalMemoryCacheKey = primaryCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(primaryCache.get(primaryLocalMemoryCacheKey)).toMatchObject({
        id: 'test-id-1',
      });

      const fallbackLocalMemoryCacheKey = fallbackCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
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

      await cacheAdapter.cacheDBMissesAsync(new SingleFieldHolder<BlahFields, 'id', 'id'>('id'), [
        new SingleFieldValueHolder('test-id-1'),
      ]);

      const primaryLocalMemoryCacheKey = primaryCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(primaryCache.get(primaryLocalMemoryCacheKey)).toBe(DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);

      const fallbackLocalMemoryCacheKey = fallbackCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(fallbackCache.get(fallbackLocalMemoryCacheKey)).toBe(
        DOES_NOT_EXIST_LOCAL_MEMORY_CACHE,
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

      const cacheHits = new Map<SingleFieldValueHolder<BlahFields, 'id'>, Readonly<BlahFields>>([
        [new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }],
      ]);
      await primaryCacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        cacheHits,
      );
      await primaryCacheAdapter.cacheDBMissesAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [new SingleFieldValueHolder('test-id-2')],
      );
      await fallbackCacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        cacheHits,
      );
      await fallbackCacheAdapter.cacheDBMissesAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [new SingleFieldValueHolder('test-id-2')],
      );

      await cacheAdapter.invalidateManyAsync(new SingleFieldHolder<BlahFields, 'id', 'id'>('id'), [
        new SingleFieldValueHolder('test-id-1'),
        new SingleFieldValueHolder('test-id-2'),
      ]);

      const primaryLocalMemoryCacheKey1 = primaryCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(primaryCache.get(primaryLocalMemoryCacheKey1)).toBe(undefined);
      const primaryLocalMemoryCacheKey2 = primaryCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(primaryCache.get(primaryLocalMemoryCacheKey2)).toBe(undefined);

      const fallbackLocalMemoryCacheKey1 = fallbackCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(fallbackCache.get(fallbackLocalMemoryCacheKey1)).toBe(undefined);
      const fallbackLocalMemoryCacheKey2 = fallbackCacheAdapter['makeCacheKey'](
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(fallbackCache.get(fallbackLocalMemoryCacheKey2)).toBe(undefined);
    });

    it('returns when passed empty array of fieldValues', async () => {
      const { cacheAdapter } = makeTestCacheAdapters();

      await cacheAdapter.invalidateManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as any,
      );
    });
  });
});
