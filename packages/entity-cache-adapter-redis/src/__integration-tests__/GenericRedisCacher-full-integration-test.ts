import { ViewerContext } from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import Redis from 'ioredis';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

import GenericRedisCacher, { RedisCacheAdapterContext } from '../GenericRedisCacher';
import RedisTestEntity from '../testfixtures/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../testfixtures/createRedisIntegrationTestEntityCompanionProvider';

class TestViewerContext extends ViewerContext {}

describe(GenericRedisCacher, () => {
  let redisCacheAdapterContext: RedisCacheAdapterContext;

  beforeAll(() => {
    redisCacheAdapterContext = {
      redisClient: new Redis(new URL(process.env['REDIS_URL']!).toString()),
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
    await redisCacheAdapterContext.redisClient.flushdb();
  });
  afterAll(async () => {
    redisCacheAdapterContext.redisClient.disconnect();
  });

  it('has correct caching behavior', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );
    const genericCacher = viewerContext.entityCompanionProvider.getCompanionForEntity(
      RedisTestEntity,
      RedisTestEntity.getCompanionDefinition()
    )['tableDataCoordinator']['cacheAdapter']['genericCacher'];
    const cacheKeyMaker = genericCacher['makeCacheKey'].bind(genericCacher);

    const entity1Created = await RedisTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .enforceCreateAsync();

    // loading an entity should put it in cache
    const entity1 = await RedisTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());

    const cachedJSON = await redisCacheAdapterContext.redisClient.get(
      cacheKeyMaker('id', entity1.getID())
    );
    const cachedValue = JSON.parse(cachedJSON!);
    expect(cachedValue).toMatchObject({
      id: entity1.getID(),
      name: 'blah',
    });

    // simulate non existent db fetch, should write negative result ('') to cache
    const nonExistentId = uuidv4();

    const entityNonExistentResult = await RedisTestEntity.loader(viewerContext).loadByIDAsync(
      nonExistentId
    );
    expect(entityNonExistentResult.ok).toBe(false);

    const nonExistentCachedValue = await redisCacheAdapterContext.redisClient.get(
      cacheKeyMaker('id', nonExistentId)
    );
    expect(nonExistentCachedValue).toEqual('');

    // load again through entities framework to ensure it reads negative result
    const entityNonExistentResult2 = await RedisTestEntity.loader(viewerContext).loadByIDAsync(
      nonExistentId
    );
    expect(entityNonExistentResult2.ok).toBe(false);

    // invalidate from cache to ensure it invalidates correctly
    await RedisTestEntity.loader(viewerContext).invalidateFieldsAsync(entity1.getAllFields());
    const cachedValueNull = await redisCacheAdapterContext.redisClient.get(
      cacheKeyMaker('id', entity1.getID())
    );
    expect(cachedValueNull).toBe(null);
  });

  it('caches and restores date fields', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );
    const date = new Date();
    const entity1 = await enforceAsyncResult(
      RedisTestEntity.creator(viewerContext).setField('dateField', date).createAsync()
    );
    expect(entity1.getField('dateField')).toEqual(date);

    const entity2 = await RedisTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1.getID());
    expect(entity2.getField('dateField')).toEqual(date);

    // simulate new request
    const vc2 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );
    const entity3 = await RedisTestEntity.loader(vc2).enforcing().loadByIDAsync(entity1.getID());
    expect(entity3.getField('dateField')).toEqual(date);
  });

  it('caches and restores empty string field keys', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );
    const entity1 = await enforceAsyncResult(
      RedisTestEntity.creator(viewerContext).setField('name', '').createAsync()
    );
    const entity2 = await RedisTestEntity.loader(viewerContext)
      .enforcing()
      .loadByFieldEqualingAsync('name', '');
    expect(entity2?.getID()).toEqual(entity1.getID());

    // simulate new request
    const vc2 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );
    const entity3 = await RedisTestEntity.loader(vc2)
      .enforcing()
      .loadByFieldEqualingAsync('name', '');
    expect(entity3?.getID()).toEqual(entity1.getID());
  });
});
