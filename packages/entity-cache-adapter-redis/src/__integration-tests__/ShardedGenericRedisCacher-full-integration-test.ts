import { ViewerContext } from '@expo/entity';
import Redis from 'ioredis';
import nullthrows from 'nullthrows';
import { URL } from 'url';

import ShardedGenericRedisCacher, {
  ShardedRedisCacheAdapterContext,
} from '../ShardedGenericRedisCacher';
import RedisTestEntity from '../testfixtures/RedisTestEntity';
import { createShardedRedisIntegrationTestEntityCompanionProvider } from '../testfixtures/createShardedRedisIntegrationTestEntityCompanionProvider';

const ids = {
  entity1: '7345999c-b97d-47af-873c-bb1e9c1876f3', // shard 0
  nonexistent: 'c207c238-70b5-41bb-8f33-130a57a6f6c5', // shard 1
};

function getShardForKey(key: string): 0 | 1 {
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

describe(ShardedGenericRedisCacher, () => {
  let redis1: Redis;
  let redis2: Redis;
  let redisCacheAdapterContext: ShardedRedisCacheAdapterContext;

  beforeAll(() => {
    redis1 = new Redis(new URL(process.env['REDIS_URL']!).toString());
    redis2 = new Redis(new URL(process.env['REDIS_URL_2']!).toString());

    redisCacheAdapterContext = {
      getShardGroupForKeysFn: (keys) => new Map(keys.map((k) => [k, getShardForKey(k)])),
      getRedisInstanceForShardGroup: (shardGroup) => (shardGroup === 0 ? redis1 : redis2),
      shardingSchemeVersion: 1,
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
    await Promise.all([redis1?.flushdb(), redis2?.flushdb()]);
  });

  afterAll(async () => {
    redis1.disconnect();
    redis2.disconnect();
  });

  it('has correct caching behavior', async () => {
    const viewerContext = new ViewerContext(
      createShardedRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );
    const genericCacher = viewerContext.entityCompanionProvider.getCompanionForEntity(
      RedisTestEntity,
      RedisTestEntity.getCompanionDefinition()
    )['tableDataCoordinator']['cacheAdapter']['genericCacher'];
    const cacheKeyMaker = genericCacher['makeCacheKey'].bind(genericCacher);
    const entity1Created = await RedisTestEntity.creator(viewerContext)
      .setField('id', ids.entity1)
      .setField('name', 'blah')
      .enforceCreateAsync();

    // loading an entity should put it in cache. load by both cached fields (which are on separate redis instances).
    const cacheKeyEntity1 = cacheKeyMaker('id', entity1Created.getID());
    const cacheKeyEntity1ShardGroup = nullthrows(
      redisCacheAdapterContext.getShardGroupForKeysFn([cacheKeyEntity1]).get(cacheKeyEntity1)
    );
    const cacheRedisClientForEntity =
      redisCacheAdapterContext.getRedisInstanceForShardGroup(cacheKeyEntity1ShardGroup);
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
    const cacheKeyEntity1NameFieldShardGroup = nullthrows(
      redisCacheAdapterContext
        .getShardGroupForKeysFn([cacheKeyEntity1NameField])
        .get(cacheKeyEntity1NameField)
    );
    const cacheRedisClientForEntityNameField =
      redisCacheAdapterContext.getRedisInstanceForShardGroup(cacheKeyEntity1NameFieldShardGroup);
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
    const cacheRedisClientForNonExistent = redisCacheAdapterContext.getRedisInstanceForShardGroup(
      nullthrows(
        redisCacheAdapterContext
          .getShardGroupForKeysFn([cacheKeyNonExistent])
          .get(cacheKeyNonExistent)
      )
    );
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
