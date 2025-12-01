import {
  CacheStatus,
  EntityConfiguration,
  GenericEntityCacheAdapter,
  SingleFieldHolder,
  SingleFieldValueHolder,
  SingleFieldValueHolderMap,
  UUIDField,
} from '@expo/entity';
import { TTLCache } from '@isaacs/ttlcache';
import { describe, expect, it } from '@jest/globals';

import {
  DOES_NOT_EXIST_LOCAL_MEMORY_CACHE,
  GenericLocalMemoryCacher,
  ILocalMemoryCache,
  LocalMemoryCacheValue,
} from '../GenericLocalMemoryCacher';

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
  cacheAdapterFlavor: 'local-memory',
});

function createTTLCache<TFields extends Record<string, any>>(): ILocalMemoryCache<TFields> {
  return new TTLCache<string, LocalMemoryCacheValue<TFields>>({
    max: 10000,
    ttl: 10 * 1000, // convert to ms
    updateAgeOnGet: true,
  });
}

describe('Use within GenericEntityCacheAdapter', () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const cacheAdapter = new GenericEntityCacheAdapter(
        new GenericLocalMemoryCacher(entityConfiguration, createTTLCache()),
      );

      const cacheHits = new Map<SingleFieldValueHolder<BlahFields, 'id'>, Readonly<BlahFields>>([
        [new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }],
      ]);
      await cacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        cacheHits,
      );
      await cacheAdapter.cacheDBMissesAsync(new SingleFieldHolder('id'), [
        new SingleFieldValueHolder('test-id-2'),
      ]);

      const results = await cacheAdapter.loadManyAsync(new SingleFieldHolder('id'), [
        new SingleFieldValueHolder('test-id-1'),
        new SingleFieldValueHolder('test-id-2'),
        new SingleFieldValueHolder('test-id-3'),
      ]);

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

    it('returns empty map when passed empty array of values', async () => {
      const cacheAdapter = new GenericEntityCacheAdapter(
        new GenericLocalMemoryCacher(entityConfiguration, createTTLCache()),
      );
      const results = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as SingleFieldValueHolder<BlahFields, 'id'>[],
      );
      expect(results).toEqual(new SingleFieldValueHolderMap(new Map()));
    });
  });

  describe('cacheManyAsync', () => {
    it('correctly caches all objects', async () => {
      const localMemoryCache = createTTLCache<BlahFields>();

      const localMemoryCacher = new GenericLocalMemoryCacher(entityConfiguration, localMemoryCache);
      const cacheAdapter = new GenericEntityCacheAdapter(localMemoryCacher);
      await cacheAdapter.cacheManyAsync(
        new SingleFieldHolder('id'),
        new Map([[new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }]]),
      );

      const cacheKey = localMemoryCacher['makeCacheKeyForStorage'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(localMemoryCache.get(cacheKey)).toMatchObject({
        id: 'test-id-1',
      });
    });
  });

  describe('cacheDBMissesAsync', () => {
    it('correctly caches misses', async () => {
      const localMemoryCache = createTTLCache<BlahFields>();

      const localMemoryCacher = new GenericLocalMemoryCacher(entityConfiguration, localMemoryCache);
      const cacheAdapter = new GenericEntityCacheAdapter(localMemoryCacher);
      await cacheAdapter.cacheDBMissesAsync(new SingleFieldHolder('id'), [
        new SingleFieldValueHolder('test-id-1'),
      ]);

      const cacheKey = localMemoryCacher['makeCacheKeyForStorage'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('test-id-1'),
      );
      expect(localMemoryCache.get(cacheKey)).toEqual(DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly', async () => {
      const localMemoryCache = createTTLCache<BlahFields>();

      const cacheAdapter = new GenericEntityCacheAdapter(
        new GenericLocalMemoryCacher(entityConfiguration, localMemoryCache),
      );
      await cacheAdapter.cacheManyAsync(
        new SingleFieldHolder('id'),
        new Map([[new SingleFieldValueHolder('test-id-1'), { id: 'test-id-1' }]]),
      );
      await cacheAdapter.cacheDBMissesAsync(new SingleFieldHolder('id'), [
        new SingleFieldValueHolder('test-id-2'),
      ]);
      await cacheAdapter.invalidateManyAsync(new SingleFieldHolder('id'), [
        new SingleFieldValueHolder('test-id-1'),
        new SingleFieldValueHolder('test-id-2'),
      ]);

      const results = await cacheAdapter.loadManyAsync(new SingleFieldHolder('id'), [
        new SingleFieldValueHolder('test-id-1'),
        new SingleFieldValueHolder('test-id-2'),
      ]);
      expect(results.get(new SingleFieldValueHolder('test-id-1'))).toMatchObject({
        status: CacheStatus.MISS,
      });
      expect(results.get(new SingleFieldValueHolder('test-id-2'))).toMatchObject({
        status: CacheStatus.MISS,
      });
    });

    it('returns when passed empty array of values', async () => {
      const cacheAdapter = new GenericEntityCacheAdapter(
        new GenericLocalMemoryCacher(entityConfiguration, createTTLCache<BlahFields>()),
      );
      await cacheAdapter.invalidateManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as SingleFieldValueHolder<BlahFields, 'id'>[],
      );
    });
  });
});
