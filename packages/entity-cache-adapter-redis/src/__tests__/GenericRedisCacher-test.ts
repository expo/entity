import {
  CacheStatus,
  EntityConfiguration,
  SingleFieldHolder,
  SingleFieldValueHolder,
  UUIDField,
} from '@expo/entity';
import { describe, expect, it } from '@jest/globals';
import { Pipeline, Redis } from 'ioredis';
import { anything, instance, mock, verify, when } from 'ts-mockito';

import { GenericRedisCacher, RedisCacheInvalidationStrategy } from '../GenericRedisCacher';

type BlahFields = {
  id: string;
};

const entityConfiguration = new EntityConfiguration<BlahFields, 'id'>({
  idField: 'id',
  tableName: 'blah',
  cacheKeyVersion: 2,
  schema: {
    id: new UUIDField({ columnName: 'id', cache: true }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

describe(GenericRedisCacher, () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const redisResults = new Map();

      const mockRedisClient = mock<Redis>();

      // need to have one anything() for each element of spread, in this case 3
      when(mockRedisClient.mget(anything(), anything(), anything())).thenCall(async (...keys) =>
        keys.map((k) => redisResults.get(k) ?? null),
      );

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
          },
        },
        entityConfiguration,
      );

      const cacheKeyWat = genericCacher['makeCacheKeyForStorage'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('wat'),
      );
      const cacheKeyWho = genericCacher['makeCacheKeyForStorage'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('who'),
      );
      const cacheKeyWhy = genericCacher['makeCacheKeyForStorage'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('why'),
      );

      redisResults.set(cacheKeyWat, JSON.stringify({ id: 'wat' }));
      redisResults.set(cacheKeyWho, '');

      const results = await genericCacher.loadManyAsync([cacheKeyWat, cacheKeyWho, cacheKeyWhy]);

      expect(results.get(cacheKeyWat)).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'wat' },
      });
      expect(results.get(cacheKeyWho)).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(results.get(cacheKeyWhy)).toMatchObject({ status: CacheStatus.MISS });
      expect(results.size).toBe(3);
    });

    it('returns empty map when passed empty array of fieldValues', async () => {
      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mock<Redis>()),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
          },
        },
        entityConfiguration,
      );
      const results = await genericCacher.loadManyAsync([]);
      expect(results).toEqual(new Map());
    });
  });

  describe('cacheManyAsync', () => {
    it('correctly caches all objects', async () => {
      const redisResults = new Map();

      const mockPipeline = mock<Pipeline>();
      when(mockPipeline.set(anything(), anything(), anything(), anything())).thenCall(
        (key, value, code, ttl) => {
          redisResults.set(key, { value, code, ttl });
          return pipeline;
        },
      );
      when(mockPipeline.exec()).thenResolve({} as any);
      const pipeline = instance(mockPipeline);

      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.multi()).thenReturn(pipeline);

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
          },
        },
        entityConfiguration,
      );

      const cacheKey = genericCacher['makeCacheKeyForStorage'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('wat'),
      );

      await genericCacher.cacheManyAsync(new Map([[cacheKey, { id: 'wat' }]]));

      expect(redisResults.get(cacheKey)).toMatchObject({
        value: JSON.stringify({ id: 'wat' }),
        code: 'EX',
        ttl: 1,
      });
    });
  });

  describe('cacheDBMissesAsync', () => {
    it('correctly caches misses', async () => {
      const redisResults = new Map();
      const mockPipeline = mock<Pipeline>();
      when(mockPipeline.set(anything(), anything(), anything(), anything())).thenCall(
        (key, value, code, ttl) => {
          redisResults.set(key, { value, code, ttl });
          return pipeline;
        },
      );
      when(mockPipeline.exec()).thenResolve({} as any);
      const pipeline = instance(mockPipeline);

      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.multi()).thenReturn(pipeline);

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
          },
        },
        entityConfiguration,
      );

      const cacheKey = genericCacher['makeCacheKeyForStorage'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('wat'),
      );

      await genericCacher.cacheDBMissesAsync([cacheKey]);

      expect(redisResults.get(cacheKey)).toMatchObject({
        value: '',
        code: 'EX',
        ttl: 2,
      });
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly with RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION', async () => {
      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.del()).thenResolve(1);

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
          },
        },
        entityConfiguration,
      );
      const cacheKeys = genericCacher['makeCacheKeysForInvalidation'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('wat'),
      );
      expect(cacheKeys).toHaveLength(1);
      expect(cacheKeys[0]).toBe('hello-:single:blah:v2.2:id:wat');

      await genericCacher.invalidateManyAsync(cacheKeys);
      verify(mockRedisClient.del(...cacheKeys)).once();
    });

    it('invalidates correctly with RedisCacheInvalidationStrategy.SURROUNDING_CACHE_KEY_VERSIONS', async () => {
      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.del()).thenResolve(1);

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.SURROUNDING_CACHE_KEY_VERSIONS,
          },
        },
        entityConfiguration,
      );
      const cacheKeys = genericCacher['makeCacheKeysForInvalidation'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('wat'),
      );
      expect(cacheKeys).toHaveLength(3);
      expect(cacheKeys[0]).toBe('hello-:single:blah:v2.1:id:wat');
      expect(cacheKeys[1]).toBe('hello-:single:blah:v2.2:id:wat');
      expect(cacheKeys[2]).toBe('hello-:single:blah:v2.3:id:wat');

      await genericCacher.invalidateManyAsync(cacheKeys);
      verify(mockRedisClient.del(...cacheKeys)).once();
    });

    it('invalidates correctly with RedisCacheInvalidationStrategy.CUSTOM', async () => {
      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.del()).thenResolve(1);

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.CUSTOM,
            cacheKeyVersionsToInvalidateFn(cacheKeyVersion) {
              return [
                cacheKeyVersion,
                cacheKeyVersion + 1,
                cacheKeyVersion + 2,
                cacheKeyVersion + 3,
              ];
            },
          },
        },
        entityConfiguration,
      );
      const cacheKeys = genericCacher['makeCacheKeysForInvalidation'](
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder('wat'),
      );
      expect(cacheKeys).toHaveLength(4);
      expect(cacheKeys[0]).toBe('hello-:single:blah:v2.2:id:wat');
      expect(cacheKeys[1]).toBe('hello-:single:blah:v2.3:id:wat');
      expect(cacheKeys[2]).toBe('hello-:single:blah:v2.4:id:wat');
      expect(cacheKeys[3]).toBe('hello-:single:blah:v2.5:id:wat');

      await genericCacher.invalidateManyAsync(cacheKeys);
      verify(mockRedisClient.del(...cacheKeys)).once();
    });

    it('returns when passed empty array of fieldValues', async () => {
      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mock<Redis>()),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
          invalidationConfig: {
            invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
          },
        },
        entityConfiguration,
      );
      await genericCacher.invalidateManyAsync([]);
    });
  });
});
