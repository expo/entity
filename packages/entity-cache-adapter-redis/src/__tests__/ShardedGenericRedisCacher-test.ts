import { CacheStatus, UUIDField, EntityConfiguration } from '@expo/entity';
import { Redis, Pipeline } from 'ioredis';
import { mock, when, instance, anything, verify } from 'ts-mockito';

import ShardedGenericRedisCacher from '../ShardedGenericRedisCacher';

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

describe(ShardedGenericRedisCacher, () => {
  describe('loadManyAsync', () => {
    it('returns appropriate cache results', async () => {
      const makeMockRedis = (): { mockRedisClient: Redis; redisResults: Map<string, string> } => {
        const redisResults = new Map();

        const mockRedisClient = mock<Redis>();

        // need to have one anything() for each element of spread, in this case 3
        when(mockRedisClient.mget(anything(), anything(), anything())).thenCall(async (...keys) =>
          keys.map((k) => redisResults.get(k) ?? null)
        );
        return { mockRedisClient, redisResults };
      };

      const [
        { mockRedisClient: mockRedisClient1, redisResults: redisResults1 },
        { mockRedisClient: mockRedisClient2, redisResults: redisResults2 },
      ] = [makeMockRedis(), makeMockRedis()];

      const redisClient1 = instance(mockRedisClient1);
      const redisClient2 = instance(mockRedisClient2);

      const genericCacher = new ShardedGenericRedisCacher(
        {
          getShardGroupForKeysFn: (keys) =>
            new Map(keys.map((k) => [k, k.includes('ins-1') ? 1 : 2])),
          getRedisInstanceForShardGroup: (shardGroup) =>
            shardGroup === 1 ? redisClient1 : redisClient2,
          shardingSchemeVersion: 1,
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyVersion: 1,
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
        },
        entityConfiguration
      );

      const cacheKeyWat1 = genericCacher['makeCacheKey']('id', 'wat-ins-1');
      const cacheKeyWho1 = genericCacher['makeCacheKey']('id', 'who-ins-1');
      const cacheKeyWhy1 = genericCacher['makeCacheKey']('id', 'why-ins-1');
      const cacheKeyWat2 = genericCacher['makeCacheKey']('id', 'wat-ins-2');
      const cacheKeyWho2 = genericCacher['makeCacheKey']('id', 'who-ins-2');
      const cacheKeyWhy2 = genericCacher['makeCacheKey']('id', 'why-ins-2');

      redisResults1.set(cacheKeyWat1, JSON.stringify({ id: 'wat-ins-1' }));
      redisResults1.set(cacheKeyWho1, '');
      redisResults2.set(cacheKeyWat2, JSON.stringify({ id: 'wat-ins-2' }));
      redisResults2.set(cacheKeyWho2, '');

      const results = await genericCacher.loadManyAsync([
        cacheKeyWat1,
        cacheKeyWho1,
        cacheKeyWhy1,
        cacheKeyWat2,
        cacheKeyWho2,
        cacheKeyWhy2,
      ]);

      expect(results.get(cacheKeyWat1)).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'wat-ins-1' },
      });
      expect(results.get(cacheKeyWho1)).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(results.get(cacheKeyWhy1)).toMatchObject({ status: CacheStatus.MISS });

      expect(results.get(cacheKeyWat2)).toMatchObject({
        status: CacheStatus.HIT,
        item: { id: 'wat-ins-2' },
      });
      expect(results.get(cacheKeyWho2)).toMatchObject({ status: CacheStatus.NEGATIVE });
      expect(results.get(cacheKeyWhy2)).toMatchObject({ status: CacheStatus.MISS });

      expect(results.size).toBe(6);
    });

    it('returns empty map when passed empty array of fieldValues', async () => {
      const mockRedisClient = mock<Redis>();
      const redisClient = instance(mockRedisClient);
      const genericCacher = new ShardedGenericRedisCacher(
        {
          getShardGroupForKeysFn: (keys) => new Map(keys.map((k) => [k, 1])),
          getRedisInstanceForShardGroup: () => redisClient,
          shardingSchemeVersion: 1,
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyVersion: 1,
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
      const makeMockRedis = (): { mockRedisClient: Redis; redisResults: Map<string, string> } => {
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

        return { mockRedisClient, redisResults };
      };

      const [
        { mockRedisClient: mockRedisClient1, redisResults: redisResults1 },
        { mockRedisClient: mockRedisClient2, redisResults: redisResults2 },
      ] = [makeMockRedis(), makeMockRedis()];

      const redisClient1 = instance(mockRedisClient1);
      const redisClient2 = instance(mockRedisClient2);

      const genericCacher = new ShardedGenericRedisCacher(
        {
          getShardGroupForKeysFn: (keys) =>
            new Map(keys.map((k) => [k, k.includes('ins-1') ? 1 : 2])),
          getRedisInstanceForShardGroup: (shardGroup) =>
            shardGroup === 1 ? redisClient1 : redisClient2,
          shardingSchemeVersion: 1,
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyVersion: 1,
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
        },
        entityConfiguration
      );

      const cacheKey1 = genericCacher['makeCacheKey']('id', 'wat-ins-1');
      const cacheKey2 = genericCacher['makeCacheKey']('id', 'wat-ins-2');

      await genericCacher.cacheManyAsync(
        new Map([
          [cacheKey1, { id: 'wat-ins-1' }],
          [cacheKey2, { id: 'wat-ins-2' }],
        ])
      );

      expect(redisResults1.get(cacheKey1)).toMatchObject({
        value: JSON.stringify({ id: 'wat-ins-1' }),
        code: 'EX',
        ttl: 1,
      });
      expect(redisResults2.get(cacheKey2)).toMatchObject({
        value: JSON.stringify({ id: 'wat-ins-2' }),
        code: 'EX',
        ttl: 1,
      });

      expect(redisResults1.get(cacheKey2)).toBeUndefined();
      expect(redisResults2.get(cacheKey1)).toBeUndefined();
    });
  });

  describe('cacheDBMissesAsync', () => {
    it('correctly caches misses', async () => {
      const makeMockRedis = (): { mockRedisClient: Redis; redisResults: Map<string, string> } => {
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

        return { mockRedisClient, redisResults };
      };

      const [
        { mockRedisClient: mockRedisClient1, redisResults: redisResults1 },
        { mockRedisClient: mockRedisClient2, redisResults: redisResults2 },
      ] = [makeMockRedis(), makeMockRedis()];

      const redisClient1 = instance(mockRedisClient1);
      const redisClient2 = instance(mockRedisClient2);

      const genericCacher = new ShardedGenericRedisCacher(
        {
          getShardGroupForKeysFn: (keys) =>
            new Map(keys.map((k) => [k, k.includes('ins-1') ? 1 : 2])),
          getRedisInstanceForShardGroup: (shardGroup) =>
            shardGroup === 1 ? redisClient1 : redisClient2,
          shardingSchemeVersion: 1,
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyVersion: 1,
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
        },
        entityConfiguration
      );

      const cacheKey1 = genericCacher['makeCacheKey']('id', 'wat-ins-1');
      const cacheKey2 = genericCacher['makeCacheKey']('id', 'wat-ins-2');

      await genericCacher.cacheDBMissesAsync([cacheKey1, cacheKey2]);

      expect(redisResults1.get(cacheKey1)).toMatchObject({
        value: '',
        code: 'EX',
        ttl: 2,
      });
      expect(redisResults2.get(cacheKey2)).toMatchObject({
        value: '',
        code: 'EX',
        ttl: 2,
      });

      expect(redisResults1.get(cacheKey2)).toBeUndefined();
      expect(redisResults2.get(cacheKey1)).toBeUndefined();
    });
  });

  describe('invalidateManyAsync', () => {
    it('invalidates correctly', async () => {
      const makeMockRedis = (): { mockRedisClient: Redis } => {
        const mockRedisClient = mock<Redis>();
        return { mockRedisClient };
      };

      const [{ mockRedisClient: mockRedisClient1 }, { mockRedisClient: mockRedisClient2 }] = [
        makeMockRedis(),
        makeMockRedis(),
      ];

      const redisClient1 = instance(mockRedisClient1);
      const redisClient2 = instance(mockRedisClient2);

      const genericCacher = new ShardedGenericRedisCacher(
        {
          getShardGroupForKeysFn: (keys) =>
            new Map(keys.map((k) => [k, k.includes('ins-1') ? 1 : 2])),
          getRedisInstanceForShardGroup: (shardGroup) =>
            shardGroup === 1 ? redisClient1 : redisClient2,
          shardingSchemeVersion: 1,
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyVersion: 1,
          cacheKeyPrefix: 'hello-',
          ttlSecondsPositive: 1,
          ttlSecondsNegative: 2,
        },
        entityConfiguration
      );
      const cacheKey1 = genericCacher['makeCacheKey']('id', 'wat-ins-1');
      const cacheKey2 = genericCacher['makeCacheKey']('id', 'wat-ins-2');

      await genericCacher.invalidateManyAsync([cacheKey1, cacheKey2]);

      verify(mockRedisClient1.del(cacheKey1)).once();
      verify(mockRedisClient2.del(cacheKey2)).once();

      verify(mockRedisClient1.del(cacheKey2)).never();
      verify(mockRedisClient2.del(cacheKey1)).never();
    });

    it('returns when passed empty array of fieldValues', async () => {
      const mockRedisClient = mock<Redis>();
      const redisClient = instance(mockRedisClient);
      const genericCacher = new ShardedGenericRedisCacher(
        {
          getShardGroupForKeysFn: (keys) => new Map(keys.map((k) => [k, 1])),
          getRedisInstanceForShardGroup: () => redisClient,
          shardingSchemeVersion: 1,
          makeKeyFn: (...parts) => parts.join(':'),
          cacheKeyVersion: 1,
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
