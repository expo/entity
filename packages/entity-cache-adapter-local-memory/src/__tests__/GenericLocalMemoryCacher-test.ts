import {
  CacheStatus,
  EntityConfiguration,
  GenericEntityCacheAdapter,
  SingleFieldHolder,
  SingleFieldValueHolder,
  SingleFieldValueHolderMap,
  UUIDField,
} from '@expo/entity';

import GenericLocalMemoryCacher, {
  DOES_NOT_EXIST_LOCAL_MEMORY_CACHE,
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

describe(GenericLocalMemoryCacher, () => {
  describe(GenericLocalMemoryCacher.createLRUCache, () => {
    it('creates a cache with default options', () => {
      const cache = GenericLocalMemoryCacher.createLRUCache();
      expect(cache.max).toBe(10000);
      expect(cache.maxAge).toBe(10000);
    });

    it('respects specified options', () => {
      const cache = GenericLocalMemoryCacher.createLRUCache({
        ttlSeconds: 3,
        maxSize: 10,
      });
      expect(cache.max).toBe(10);
      expect(cache.maxAge).toBe(3000);
    });
  });

  describe(GenericLocalMemoryCacher.createNoOpCache, () => {
    it('creates a no-op cache', () => {
      const cache = GenericLocalMemoryCacher.createNoOpCache<{ hello: 'world' }>();
      cache.set('a', { hello: 'world' });
      expect(cache.get('a')).toBeUndefined();
    });
  });
});

describe('Use within GenericEntityCacheAdapter', () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const cacheAdapter = new GenericEntityCacheAdapter(
        new GenericLocalMemoryCacher(
          entityConfiguration,
          GenericLocalMemoryCacher.createLRUCache(),
        ),
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
        new GenericLocalMemoryCacher(
          entityConfiguration,
          GenericLocalMemoryCacher.createLRUCache(),
        ),
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
      const localMemoryCache = GenericLocalMemoryCacher.createLRUCache<BlahFields>({});

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
      const localMemoryCache = GenericLocalMemoryCacher.createLRUCache<BlahFields>({});

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
      const localMemoryCache = GenericLocalMemoryCacher.createLRUCache<BlahFields>({});

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
        new GenericLocalMemoryCacher(
          entityConfiguration,
          GenericLocalMemoryCacher.createLRUCache<BlahFields>({}),
        ),
      );
      await cacheAdapter.invalidateManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as SingleFieldValueHolder<BlahFields, 'id'>[],
      );
    });
  });
});
