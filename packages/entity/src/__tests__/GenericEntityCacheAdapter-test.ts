import { mock, when, instance, anything, verify, anyString, deepEqual } from 'ts-mockito';

import GenericEntityCacheAdapter from '../GenericEntityCacheAdapter';
import IEntityGenericCacher from '../IEntityGenericCacher';
import { CacheStatus } from '../internal/ReadThroughEntityCache';

type BlahFields = {
  id: string;
};

describe(GenericEntityCacheAdapter, () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields>>();
      when(mockGenericCacher.makeCacheKey('id', anyString())).thenCall((fieldName, fieldValue) => {
        return `${fieldName}.${fieldValue}`;
      });
      when(mockGenericCacher.loadManyAsync(deepEqual(['id.wat', 'id.who', 'id.why']))).thenResolve(
        new Map([
          ['id.wat', { status: CacheStatus.HIT, item: { id: 'wat' } }],
          ['id.who', { status: CacheStatus.NEGATIVE }],
          ['id.why', { status: CacheStatus.MISS }],
        ])
      );

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));

      const results = await cacheAdapter.loadManyAsync('id', ['wat', 'who', 'why']);
      expect(results.get('wat')).toMatchObject({ status: CacheStatus.HIT, item: { id: 'wat' } });
      expect(results.get('who')).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(results.get('why')).toMatchObject({ status: CacheStatus.MISS });
      expect(results.size).toBe(3);

      verify(mockGenericCacher.loadManyAsync(anything())).once();
    });

    it('returns empty map when passed empty array of fieldValues', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields>>();
      when(mockGenericCacher.loadManyAsync(deepEqual([]))).thenResolve(new Map([]));

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      const results = await cacheAdapter.loadManyAsync('id', []);
      expect(results).toEqual(new Map());
    });
  });

  describe('cacheManyAsync', () => {
    it('correctly caches all objects', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields>>();
      when(mockGenericCacher.makeCacheKey('id', anyString())).thenCall((fieldName, fieldValue) => {
        return `${fieldName}.${fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.cacheManyAsync('id', new Map([['wat', { id: 'wat' }]]));

      verify(
        mockGenericCacher.cacheManyAsync(deepEqual(new Map([['id.wat', { id: 'wat' }]])))
      ).once();
    });
  });

  describe('cacheDBMissesAsync', () => {
    it('correctly caches misses', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields>>();
      when(mockGenericCacher.makeCacheKey('id', anyString())).thenCall((fieldName, fieldValue) => {
        return `${fieldName}.${fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.cacheDBMissesAsync('id', ['wat']);

      verify(mockGenericCacher.cacheDBMissesAsync(deepEqual(['id.wat']))).once();
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields>>();
      when(mockGenericCacher.makeCacheKey('id', anyString())).thenCall((fieldName, fieldValue) => {
        return `${fieldName}.${fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.invalidateManyAsync('id', ['wat']);

      verify(mockGenericCacher.invalidateManyAsync(deepEqual(['id.wat']))).once();
    });

    it('returns when passed empty array of fieldValues', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields>>();
      when(mockGenericCacher.makeCacheKey('id', anyString())).thenCall((fieldName, fieldValue) => {
        return `${fieldName}.${fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.invalidateManyAsync('id', []);

      verify(mockGenericCacher.invalidateManyAsync(deepEqual([]))).once();
    });
  });
});
