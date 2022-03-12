import { CacheStatus, UUIDField, EntityConfiguration } from '@expo/entity';

import GenericLocalMemoryCacher, {
  DOES_NOT_EXIST_LOCAL_MEMORY_CACHE,
} from '../GenericLocalMemoryCacher';
import LocalMemoryCacheAdapter from '../LocalMemoryCacheAdapter';

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
  cacheAdapterFlavor: 'local-memory',
});

describe(LocalMemoryCacheAdapter, () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const cacheAdapter = new LocalMemoryCacheAdapter(
        entityConfiguration,
        GenericLocalMemoryCacher.createLRUCache()
      );

      const cacheHits = new Map<string, Readonly<BlahFields>>([['test-id-1', { id: 'test-id-1' }]]);
      await cacheAdapter.cacheManyAsync('id', cacheHits);
      await cacheAdapter.cacheDBMissesAsync('id', ['test-id-2']);

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

    it('returns empty map when passed empty array of fieldValues', async () => {
      const cacheAdapter = new LocalMemoryCacheAdapter(
        entityConfiguration,
        GenericLocalMemoryCacher.createLRUCache()
      );
      const results = await cacheAdapter.loadManyAsync('id', []);
      expect(results).toEqual(new Map());
    });
  });

  describe('cacheManyAsync', () => {
    it('correctly caches all objects', async () => {
      const localMemoryCache = GenericLocalMemoryCacher.createLRUCache<BlahFields>({});

      const cacheAdapter = new LocalMemoryCacheAdapter(entityConfiguration, localMemoryCache);
      await cacheAdapter.cacheManyAsync('id', new Map([['test-id-1', { id: 'test-id-1' }]]));

      const cacheKey = cacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(localMemoryCache.get(cacheKey)).toMatchObject({
        id: 'test-id-1',
      });
    });
  });

  describe('cacheDBMissesAsync', () => {
    it('correctly caches misses', async () => {
      const localMemoryCache = GenericLocalMemoryCacher.createLRUCache<BlahFields>({});

      const cacheAdapter = new LocalMemoryCacheAdapter(entityConfiguration, localMemoryCache);
      await cacheAdapter.cacheDBMissesAsync('id', ['test-id-1']);

      const cacheKey = cacheAdapter['makeCacheKey']('id', 'test-id-1');
      expect(localMemoryCache.get(cacheKey)).toEqual(DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly', async () => {
      const localMemoryCache = GenericLocalMemoryCacher.createLRUCache<BlahFields>({});

      const cacheAdapter = new LocalMemoryCacheAdapter(entityConfiguration, localMemoryCache);
      await cacheAdapter.cacheManyAsync('id', new Map([['test-id-1', { id: 'test-id-1' }]]));
      await cacheAdapter.cacheDBMissesAsync('id', ['test-id-2']);
      await cacheAdapter.invalidateManyAsync('id', ['test-id-1', 'test-id-2']);

      const results = await cacheAdapter.loadManyAsync('id', ['test-id-1', 'test-id-2']);
      expect(results.get('test-id-1')).toMatchObject({ status: CacheStatus.MISS });
      expect(results.get('test-id-2')).toMatchObject({ status: CacheStatus.MISS });
    });

    it('returns when passed empty array of fieldValues', async () => {
      const cacheAdapter = new LocalMemoryCacheAdapter(
        entityConfiguration,
        GenericLocalMemoryCacher.createLRUCache<BlahFields>({})
      );
      await cacheAdapter.invalidateManyAsync('id', []);
    });
  });
});
