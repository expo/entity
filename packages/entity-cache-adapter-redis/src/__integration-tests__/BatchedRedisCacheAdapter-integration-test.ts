import { Batcher } from '@expo/batcher';
import {
  IEntityGenericCacher,
  SingleFieldHolder,
  SingleFieldValueHolder,
  ViewerContext,
  zipToMap,
} from '@expo/entity';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import invariant from 'invariant';
import nullthrows from 'nullthrows';
import { v4 as uuidv4 } from 'uuid';

import {
  GenericRedisCacheContext,
  GenericRedisCacher,
  IRedis,
  IRedisTransaction,
  RedisCacheInvalidationStrategy,
} from '../GenericRedisCacher';
import { Redis, StartedRedisContainer, startRedisAsync } from './testcontainer';
import { RedisTestEntity, RedisTestEntityFields } from '../__testfixtures__/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createRedisIntegrationTestEntityCompanionProvider';

class BatchedRedis implements IRedis {
  private readonly mgetBatcher = new Batcher<string[], (string | null)[]>(
    this.batchMgetAsync.bind(this),
    {
      maxBatchInterval: 0,
    },
  );

  constructor(private readonly redis: Redis) {}

  private async batchMgetAsync(keySets: string[][]): Promise<(string | null)[][]> {
    // ordered distinct keys to fetch
    const allKeysToFetch = [...new Set(keySets.flat())];

    // fetch the distinct keys
    const allResults = await this.redis.mget(...allKeysToFetch);

    // put them into a map for fast lookup
    const keysToResults = zipToMap(allKeysToFetch, allResults);

    // re-associate them with original key sets
    return keySets.map((keySet) =>
      keySet.map((key) => {
        const result = keysToResults.get(key);
        invariant(result !== undefined, 'result should not be undefined');
        return result;
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  async mget(...args: string[]): Promise<(string | null)[]> {
    return await this.mgetBatcher.batchAsync(args);
  }

  multi(): IRedisTransaction {
    return this.redis.multi();
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  async del(...args: string[]): Promise<void> {
    await this.redis.del(...args);
  }
}

describe(GenericRedisCacher, () => {
  let container: StartedRedisContainer;
  let redisClient: Redis;
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(async () => {
    ({ container, redisClient } = await startRedisAsync());
    genericRedisCacheContext = {
      redisClient: new BatchedRedis(redisClient),
      makeKeyFn(...parts: string[]): string {
        const delimiter = ':';
        const escapedParts = parts.map((part) =>
          part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`),
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
      invalidationConfig: {
        invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
      },
    };
  });

  beforeEach(async () => {
    await redisClient.flushdb();
  });

  afterAll(async () => {
    redisClient.disconnect();
    await container.stop();
  });

  it('has correct caching behavior', async () => {
    // simulate two requests
    const viewerContext = new ViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );

    const mgetSpy = jest.spyOn(redisClient, 'mget');

    const genericCacher = viewerContext.entityCompanionProvider.getCompanionForEntity(
      RedisTestEntity,
    )['tableDataCoordinator']['cacheAdapter']['genericCacher'] as IEntityGenericCacher<
      RedisTestEntityFields,
      'id'
    >;

    const entity1Created = await RedisTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .createAsync();

    // loading an entity should put it in cache. load by multiple requests and multiple fields in same tick to ensure batch works
    mgetSpy.mockClear();
    const viewerContext1 = new ViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const viewerContext2 = new ViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const viewerContext3 = new ViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const [entity1, entity2, entity3] = await Promise.all([
      RedisTestEntity.loader(viewerContext1).loadByIDAsync(entity1Created.getID()),
      RedisTestEntity.loader(viewerContext2).loadByIDAsync(entity1Created.getID()),
      RedisTestEntity.loader(viewerContext3).loadByFieldEqualingAsync(
        'name',
        entity1Created.getField('name'),
      ),
    ]);

    expect(mgetSpy).toHaveBeenCalledTimes(1);
    expect(mgetSpy.mock.calls[0]).toHaveLength(2); // should dedupe the first two loads
    expect(entity1.getID()).toEqual(entity2.getID());
    expect(entity2.getID()).toEqual(nullthrows(entity3).getID());

    const cacheKeyEntity1 = genericCacher.makeCacheKeyForStorage(
      new SingleFieldHolder('id'),
      new SingleFieldValueHolder(entity1Created.getID()),
    );
    const cachedJSON = await redisClient.get(cacheKeyEntity1);
    const cachedValue = JSON.parse(cachedJSON!);
    expect(cachedValue).toMatchObject({
      id: entity1.getID(),
      name: 'blah',
    });

    const cacheKeyEntity1NameField = genericCacher.makeCacheKeyForStorage(
      new SingleFieldHolder('name'),
      new SingleFieldValueHolder(entity1Created.getField('name')),
    );
    await RedisTestEntity.loader(viewerContext).loadByFieldEqualingAsync(
      'name',
      entity1Created.getField('name'),
    );
    await expect(redisClient.get(cacheKeyEntity1NameField)).resolves.toEqual(cachedJSON);

    // simulate non existent db fetch, should write negative result ('') to cache
    const nonExistentId = uuidv4();
    const entityNonExistentResult =
      await RedisTestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync(
        nonExistentId,
      );
    expect(entityNonExistentResult.ok).toBe(false);
    const cacheKeyNonExistent = genericCacher.makeCacheKeyForStorage(
      new SingleFieldHolder('id'),
      new SingleFieldValueHolder(nonExistentId),
    );
    const nonExistentCachedValue = await redisClient.get(cacheKeyNonExistent);
    expect(nonExistentCachedValue).toEqual('');
    // load again through entities framework to ensure it reads negative result
    const entityNonExistentResult2 =
      await RedisTestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync(
        nonExistentId,
      );
    expect(entityNonExistentResult2.ok).toBe(false);

    // invalidate from cache to ensure it invalidates correctly in both caches
    await RedisTestEntity.loaderUtils(viewerContext).invalidateFieldsAsync(entity1.getAllFields());
    await expect(redisClient.get(cacheKeyEntity1)).resolves.toBeNull();
    await expect(redisClient.get(cacheKeyEntity1NameField)).resolves.toBeNull();
  });
});
