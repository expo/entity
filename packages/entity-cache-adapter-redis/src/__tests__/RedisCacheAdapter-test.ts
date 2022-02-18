import { CacheStatus, UUIDField, EntityConfiguration } from '@expo/entity';
import { Redis, Pipeline } from 'ioredis';
import { mock, when, instance, anything, verify } from 'ts-mockito';

import RedisCacheAdapter from '../RedisCacheAdapter';

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
  cacheAdapterFlavor: 'redis',
});

describe(RedisCacheAdapter, () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const redisResults = new Map();

      const mockRedisClient = mock<Redis>();

      // need to have one anything() for each element of spread, in this case 3
      when(mockRedisClient.mget(anything(), anything(), anything())).thenCall(async (...keys) =>
        keys.map((k) => redisResults.get(k) ?? null)
      );

      const cacheAdapter = new RedisCacheAdapter(entityConfiguration, {
        redisClient: instance(mockRedisClient),
        makeKeyFn: (...parts) => parts.join(':'),
        cacheKeyVersion: 1,
        cacheKeyPrefix: 'hello-',
        ttlSecondsPositive: 1,
        ttlSecondsNegative: 2,
      });

      redisResults.set(
        cacheAdapter['partsCacher']['makeCacheKey']('id', 'wat'),
        JSON.stringify({ id: 'wat' })
      );
      redisResults.set(cacheAdapter['partsCacher']['makeCacheKey']('id', 'who'), '');

      const results = await cacheAdapter.loadManyAsync('id', ['wat', 'who', 'why']);

      expect(results.get('wat')).toMatchObject({ status: CacheStatus.HIT, item: { id: 'wat' } });
      expect(results.get('who')).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(results.get('why')).toMatchObject({ status: CacheStatus.MISS });
      expect(results.size).toBe(3);
    });

    it('returns empty map when passed empty array of fieldValues', async () => {
      const cacheAdapter = new RedisCacheAdapter(entityConfiguration, {
        redisClient: instance(mock<Redis>()),
        makeKeyFn: (...parts) => parts.join(':'),
        cacheKeyVersion: 1,
        cacheKeyPrefix: 'hello-',
        ttlSecondsPositive: 1,
        ttlSecondsNegative: 2,
      });
      const results = await cacheAdapter.loadManyAsync('id', []);
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
        }
      );
      when(mockPipeline.exec()).thenResolve({} as any);
      const pipeline = instance(mockPipeline);

      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.multi()).thenReturn(pipeline);

      const cacheAdapter = new RedisCacheAdapter(entityConfiguration, {
        redisClient: instance(mockRedisClient),
        makeKeyFn: (...parts) => parts.join(':'),
        cacheKeyVersion: 1,
        cacheKeyPrefix: 'hello-',
        ttlSecondsPositive: 1,
        ttlSecondsNegative: 2,
      });
      await cacheAdapter.cacheManyAsync('id', new Map([['wat', { id: 'wat' }]]));

      const cacheKey = cacheAdapter['partsCacher']['makeCacheKey']('id', 'wat');
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
        }
      );
      when(mockPipeline.exec()).thenResolve({} as any);
      const pipeline = instance(mockPipeline);

      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.multi()).thenReturn(pipeline);

      const cacheAdapter = new RedisCacheAdapter(entityConfiguration, {
        redisClient: instance(mockRedisClient),
        makeKeyFn: (...parts) => parts.join(':'),
        cacheKeyVersion: 1,
        cacheKeyPrefix: 'hello-',
        ttlSecondsPositive: 1,
        ttlSecondsNegative: 2,
      });
      await cacheAdapter.cacheDBMissesAsync('id', ['wat']);

      const cacheKey = cacheAdapter['partsCacher']['makeCacheKey']('id', 'wat');
      expect(redisResults.get(cacheKey)).toMatchObject({
        value: '',
        code: 'EX',
        ttl: 2,
      });
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly', async () => {
      const mockRedisClient = mock<Redis>();
      when(mockRedisClient.del()).thenResolve(1);

      const cacheAdapter = new RedisCacheAdapter(entityConfiguration, {
        redisClient: instance(mockRedisClient),
        makeKeyFn: (...parts) => parts.join(':'),
        cacheKeyVersion: 1,
        cacheKeyPrefix: 'hello-',
        ttlSecondsPositive: 1,
        ttlSecondsNegative: 2,
      });
      await cacheAdapter.invalidateManyAsync('id', ['wat']);

      const cacheKey = cacheAdapter['partsCacher']['makeCacheKey']('id', 'wat');
      verify(mockRedisClient.del(cacheKey)).once();
    });

    it('returns when passed empty array of fieldValues', async () => {
      const cacheAdapter = new RedisCacheAdapter(entityConfiguration, {
        redisClient: instance(mock<Redis>()),
        makeKeyFn: (...parts) => parts.join(':'),
        cacheKeyVersion: 1,
        cacheKeyPrefix: 'hello-',
        ttlSecondsPositive: 1,
        ttlSecondsNegative: 2,
      });
      await cacheAdapter.invalidateManyAsync('id', []);
    });
  });
});
