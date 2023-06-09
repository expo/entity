import { CacheStatus, UUIDField, EntityConfiguration } from '@expo/entity';
import { Redis, Pipeline } from 'ioredis';
import { mock, when, instance, anything, verify } from 'ts-mockito';

import GenericRedisCacher from '../GenericRedisCacher';

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

describe(GenericRedisCacher, () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const redisResults = new Map();

      const mockRedisClient = mock<Redis>();

      // need to have one anything() for each element of spread, in this case 3
      when(mockRedisClient.mget(anything(), anything(), anything())).thenCall(async (...keys) =>
        keys.map((k) => redisResults.get(k) ?? null)
      );

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
        },
        entityConfiguration
      );

      const cacheKeyWat = genericCacher['makeCacheKey']('id', 'wat');
      const cacheKeyWho = genericCacher['makeCacheKey']('id', 'who');
      const cacheKeyWhy = genericCacher['makeCacheKey']('id', 'why');

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
        },
        entityConfiguration
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
        }
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
        },
        entityConfiguration
      );

      const cacheKey = genericCacher['makeCacheKey']('id', 'wat');

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
        }
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
        },
        entityConfiguration
      );

      const cacheKey = genericCacher['makeCacheKey']('id', 'wat');

      await genericCacher.cacheDBMissesAsync([cacheKey]);

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

      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mockRedisClient),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
        },
        entityConfiguration
      );
      const cacheKey = genericCacher['makeCacheKey']('id', 'wat');

      await genericCacher.invalidateManyAsync([cacheKey]);

      verify(mockRedisClient.del(cacheKey)).once();
    });

    it('returns when passed empty array of fieldValues', async () => {
      const genericCacher = new GenericRedisCacher(
        {
          redisClient: instance(mock<Redis>()),
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
        },
        entityConfiguration
      );
      await genericCacher.invalidateManyAsync([]);
    });
  });
});
