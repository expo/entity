import { describe, expect, it } from '@jest/globals';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';

import { GenericEntityCacheAdapter } from '../GenericEntityCacheAdapter';
import { IEntityGenericCacher } from '../IEntityGenericCacher';
import { EntityCacheAdapterTransientError } from '../errors/EntityCacheAdapterError';
import { CacheStatus } from '../internal/ReadThroughEntityCache';
import {
  SingleFieldHolder,
  SingleFieldValueHolder,
  SingleFieldValueHolderMap,
} from '../internal/SingleFieldHolder';
import { deepEqualEntityAware } from '../utils/__testfixtures__/TSMockitoExtensions';

type BlahFields = {
  id: string;
};

describe(GenericEntityCacheAdapter, () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields, 'id'>>();
      when(
        mockGenericCacher.makeCacheKeyForStorage(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id', 'id'>('id')),
          anything(),
        ),
      ).thenCall((fieldHolder, fieldValueHolder) => {
        return `${fieldHolder.fieldName}.${fieldValueHolder.fieldValue}`;
      });
      when(mockGenericCacher.loadManyAsync(deepEqual(['id.wat', 'id.who', 'id.why']))).thenResolve(
        new Map([
          ['id.wat', { status: CacheStatus.HIT, item: { id: 'wat' } }],
          ['id.who', { status: CacheStatus.NEGATIVE }],
          ['id.why', { status: CacheStatus.MISS }],
        ]),
      );

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));

      const results = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [
          new SingleFieldValueHolder('wat'),
          new SingleFieldValueHolder('who'),
          new SingleFieldValueHolder('why'),
        ],
      );
      expect(results.get(new SingleFieldValueHolder('wat'))).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'wat' },
      });
      expect(results.get(new SingleFieldValueHolder('who'))).toMatchObject({
        status: CacheStatus.NEGATIVE,
      });
      expect(results.get(new SingleFieldValueHolder('why'))).toMatchObject({
        status: CacheStatus.MISS,
      });
      expect(results.size).toBe(3);

      verify(mockGenericCacher.loadManyAsync(anything())).once();
    });

    it('returns empty map when passed empty array of load values', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields, 'id'>>();
      when(mockGenericCacher.loadManyAsync(deepEqual([]))).thenResolve(new Map([]));

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      const results = await cacheAdapter.loadManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as SingleFieldValueHolder<BlahFields, 'id'>[],
      );
      expect(results).toEqual(new SingleFieldValueHolderMap(new Map()));
    });

    it('rethrows EntityCacheAdapterTransientError from underlying cacher', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields, 'id'>>();
      when(
        mockGenericCacher.makeCacheKeyForStorage(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id', 'id'>('id')),
          anything(),
        ),
      ).thenCall((fieldHolder, fieldValueHolder) => {
        return `${fieldHolder.fieldName}.${fieldValueHolder.fieldValue}`;
      });
      const expectedError = new EntityCacheAdapterTransientError('Transient error');
      when(mockGenericCacher.loadManyAsync(deepEqual(['id.wat']))).thenReject(expectedError);

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await expect(
        cacheAdapter.loadManyAsync(new SingleFieldHolder<BlahFields, 'id', 'id'>('id'), [
          new SingleFieldValueHolder('wat'),
        ]),
      ).rejects.toThrow(expectedError);

      verify(mockGenericCacher.loadManyAsync(anything())).once();
    });
  });

  describe('cacheManyAsync', () => {
    it('correctly caches all objects', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields, 'id'>>();
      when(
        mockGenericCacher.makeCacheKeyForStorage(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id', 'id'>('id')),
          anything(),
        ),
      ).thenCall((fieldHolder, fieldValueHolder) => {
        return `${fieldHolder.fieldName}.${fieldValueHolder.fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.cacheManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        new Map([[new SingleFieldValueHolder('wat'), { id: 'wat' }]]),
      );

      verify(
        mockGenericCacher.cacheManyAsync(deepEqual(new Map([['id.wat', { id: 'wat' }]]))),
      ).once();
    });
  });

  describe('cacheDBMissesAsync', () => {
    it('correctly caches misses', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields, 'id'>>();
      when(
        mockGenericCacher.makeCacheKeyForStorage(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id', 'id'>('id')),
          anything(),
        ),
      ).thenCall((fieldHolder, fieldValueHolder) => {
        return `${fieldHolder.fieldName}.${fieldValueHolder.fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.cacheDBMissesAsync(new SingleFieldHolder<BlahFields, 'id', 'id'>('id'), [
        new SingleFieldValueHolder('wat'),
      ]);

      verify(mockGenericCacher.cacheDBMissesAsync(deepEqual(['id.wat']))).once();
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields, 'id'>>();
      when(
        mockGenericCacher.makeCacheKeysForInvalidation(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id', 'id'>('id')),
          anything(),
        ),
      ).thenCall((fieldHolder, fieldValueHolder) => {
        return `${fieldHolder.fieldName}.${fieldValueHolder.fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.invalidateManyAsync(new SingleFieldHolder<BlahFields, 'id', 'id'>('id'), [
        new SingleFieldValueHolder('wat'),
      ]);

      verify(mockGenericCacher.invalidateManyAsync(deepEqual(['id.wat']))).once();
    });

    it('returns when passed empty array of fieldValues', async () => {
      const mockGenericCacher = mock<IEntityGenericCacher<BlahFields, 'id'>>();
      when(
        mockGenericCacher.makeCacheKeysForInvalidation(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id', 'id'>('id')),
          anything(),
        ),
      ).thenCall((fieldHolder, fieldValueHolder) => {
        return `${fieldHolder.fieldName}.${fieldValueHolder.fieldValue}`;
      });

      const cacheAdapter = new GenericEntityCacheAdapter(instance(mockGenericCacher));
      await cacheAdapter.invalidateManyAsync(
        new SingleFieldHolder<BlahFields, 'id', 'id'>('id'),
        [] as SingleFieldValueHolder<BlahFields, 'id'>[],
      );

      verify(mockGenericCacher.invalidateManyAsync(deepEqual([]))).once();
    });
  });
});
