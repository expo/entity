import { computeIfAbsent, mapMap, mapMapAsync, ViewerContext } from '@expo/entity';
import invariant from 'invariant';
import Redis from 'ioredis';
import nullthrows from 'nullthrows';
import { URL } from 'url';

import { IRedis, IRedisTransaction } from '../GenericRedisCacher';
import RedisCacheAdapter, { RedisCacheAdapterContext } from '../RedisCacheAdapter';
import RedisTestEntity from '../testfixtures/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../testfixtures/createRedisIntegrationTestEntityCompanionProvider';

//       shardingSchemeVersion: 1,

const ids = {
  entity1: '7345999c-b97d-47af-873c-bb1e9c1876f3', // shard 0
  nonexistent: 'c207c238-70b5-41bb-8f33-130a57a6f6c5', // shard 1
};

function getShardForKey(key: string): number {
  if (key.includes(ids.entity1)) {
    return 0;
  }

  if (key.includes(ids.nonexistent)) {
    return 1;
  }

  // entity1
  if (key.includes('name:blah')) {
    return 1; // put other field cache for entity1 on different server than the id field cached value
  }

  throw Error('unknown id encountered: ' + key);
}

function assertNotUndefined<T>(value: T | undefined): T {
  invariant(value !== undefined, 'must not be undefined');
  return value;
}

type SetInstruction = { key: string; value: string; secondsToken: 'EX'; seconds: number };

class ShardedRedis implements IRedis {
  constructor(private readonly redium: readonly Redis[]) {}

  async mget(...args: string[]): Promise<(string | null)[]> {
    const originalKeys = args;
    const redisClientsForKeys = this.getRedisClientsForKeys(args);
    const allKeysToValues = new Map<string, string | null>();
    await mapMapAsync(redisClientsForKeys, async ({ redisClient, keys }) => {
      const values = await redisClient.mget(keys);
      for (let i = 0; i < keys.length; i++) {
        allKeysToValues.set(nullthrows(keys[i]), assertNotUndefined(values[i]));
      }
    });

    return originalKeys.map((k) => assertNotUndefined(allKeysToValues.get(k)));
  }
  multi(): IRedisTransaction {
    const accumulatedSets: Map<string, SetInstruction> = new Map();
    const parentExec = async (): Promise<void> => {
      const redisClientsForKeys = this.getRedisClientsForKeys([...accumulatedSets.keys()]);
      const redisClientsForInstructions = mapMap(redisClientsForKeys, ({ keys, redisClient }) => {
        return {
          keys,
          sets: keys.map((k) => assertNotUndefined(accumulatedSets.get(k))),
          redisClient,
        };
      });

      await mapMapAsync(redisClientsForInstructions, async ({ sets, redisClient }) => {
        let redisTransaction = redisClient.multi();
        sets.forEach(({ key, value, secondsToken, seconds }) => {
          redisTransaction = redisTransaction.set(key, value, secondsToken, seconds);
        });
        await redisTransaction.exec();
      });
    };
    const ret: IRedisTransaction = {
      set(key, value, secondsToken, seconds): any {
        accumulatedSets.set(key, { key, value, secondsToken, seconds });
        return ret;
      },
      async exec(): Promise<any> {
        return await parentExec();
      },
    };
    return ret;
  }

  async del(...args: string[]): Promise<void> {
    const redisClientsForKeys = this.getRedisClientsForKeys(args);
    await mapMapAsync(redisClientsForKeys, async ({ keys, redisClient }) => {
      await redisClient.del(...keys);
    });
  }

  private getRedisClientsForKeys(
    keys: readonly string[]
  ): Map<number, { keys: string[]; redisClient: Redis }> {
    const shardGroupsForKeys = new Map(keys.map((k) => [k, getShardForKey(k)]));
    const redisClientsForKeys = new Map<number, { keys: string[]; redisClient: Redis }>();
    for (const [key, shardGroup] of shardGroupsForKeys) {
      const entry = computeIfAbsent(redisClientsForKeys, shardGroup, (currShardGroup) => ({
        keys: [],
        redisClient: this.getRedisInstanceForShardGroup(currShardGroup),
      }));
      entry.keys.push(key);
    }
    return redisClientsForKeys;
  }

  private getRedisInstanceForShardGroup(shardGroup: number): Redis {
    return nullthrows(this.redium[shardGroup]);
  }
}

describe(RedisCacheAdapter, () => {
  const redium = [
    new Redis(new URL(process.env['REDIS_URL']!).toString()),
    new Redis(new URL(process.env['REDIS_URL_2']!).toString()),
  ];

  const redisClient = new ShardedRedis(redium);

  let redisCacheAdapterContext: RedisCacheAdapterContext;

  beforeAll(() => {
    redisCacheAdapterContext = {
      redisClient,
      makeKeyFn(...parts: string[]): string {
        const delimiter = ':';
        const escapedParts = parts.map((part) =>
          part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      cacheKeyVersion: 1,
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
    };
  });

  beforeEach(async () => {
    await Promise.all(redium.map((redis) => redis.flushdb()));
  });

  afterAll(async () => {
    redium.map((redis) => redis.disconnect());
  });

  it('has correct caching behavior', async () => {
    const viewerContext = new ViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );
    const cacheAdapter = viewerContext.entityCompanionProvider.getCompanionForEntity(
      RedisTestEntity,
      RedisTestEntity.getCompanionDefinition()
    )['tableDataCoordinator']['cacheAdapter'];
    const cacheKeyMaker = cacheAdapter['makeCacheKey'].bind(cacheAdapter);
    const entity1Created = await RedisTestEntity.creator(viewerContext)
      .setField('id', ids.entity1)
      .setField('name', 'blah')
      .enforceCreateAsync();

    // loading an entity should put it in cache. load by both cached fields (which are on separate redis instances).
    const cacheKeyEntity1 = cacheKeyMaker('id', entity1Created.getID());
    const cacheKeyEntity1ShardGroup = getShardForKey(cacheKeyEntity1);
    const cacheRedisClientForEntity = nullthrows(redium[cacheKeyEntity1ShardGroup]);
    const entity1 = await RedisTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());
    const cachedJSON = await cacheRedisClientForEntity.get(cacheKeyEntity1);
    const cachedValue = JSON.parse(cachedJSON!);
    expect(cachedValue).toMatchObject({
      id: entity1.getID(),
      name: 'blah',
    });

    const cacheKeyEntity1NameField = cacheKeyMaker('name', entity1Created.getField('name'));
    const cacheKeyEntity1NameFieldShardGroup = getShardForKey(cacheKeyEntity1NameField);
    const cacheRedisClientForEntityNameField = nullthrows(
      redium[cacheKeyEntity1NameFieldShardGroup]
    );
    await RedisTestEntity.loader(viewerContext)
      .enforcing()
      .loadByFieldEqualingAsync('name', entity1Created.getField('name'));
    await expect(cacheRedisClientForEntityNameField.get(cacheKeyEntity1NameField)).resolves.toEqual(
      cachedJSON
    );

    expect(cacheKeyEntity1ShardGroup).not.toEqual(cacheKeyEntity1NameFieldShardGroup);

    // simulate non existent db fetch, should write negative result ('') to cache
    const nonExistentId = ids.nonexistent;
    const entityNonExistentResult = await RedisTestEntity.loader(viewerContext).loadByIDAsync(
      nonExistentId
    );
    expect(entityNonExistentResult.ok).toBe(false);
    const cacheKeyNonExistent = cacheKeyMaker('id', nonExistentId);
    const cacheRedisClientForNonExistent = nullthrows(redium[getShardForKey(cacheKeyNonExistent)]);
    const nonExistentCachedValue = await cacheRedisClientForNonExistent.get(cacheKeyNonExistent);
    expect(nonExistentCachedValue).toEqual('');
    // load again through entities framework to ensure it reads negative result
    const entityNonExistentResult2 = await RedisTestEntity.loader(viewerContext).loadByIDAsync(
      nonExistentId
    );
    expect(entityNonExistentResult2.ok).toBe(false);

    // invalidate from cache to ensure it invalidates correctly in both caches
    await RedisTestEntity.loader(viewerContext).invalidateFieldsAsync(entity1.getAllFields());
    await expect(cacheRedisClientForEntity.get(cacheKeyEntity1)).resolves.toBeNull();
    await expect(
      cacheRedisClientForEntityNameField.get(cacheKeyEntity1NameField)
    ).resolves.toBeNull();
  });
});
