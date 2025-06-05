import {
  CompositeFieldHolder,
  CompositeFieldValueHolder,
  IEntityGenericCacher,
  SingleFieldHolder,
  SingleFieldValueHolder,
  ViewerContext,
} from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import Redis from 'ioredis';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

import GenericRedisCacher, {
  GenericRedisCacheContext,
  RedisCacheInvalidationStrategy,
} from '../GenericRedisCacher';
import RedisTestEntity, { RedisTestEntityFields } from '../__testfixtures__/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createRedisIntegrationTestEntityCompanionProvider';

class TestViewerContext extends ViewerContext {}

describe(GenericRedisCacher, () => {
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(() => {
    genericRedisCacheContext = {
      redisClient: new Redis(new URL(process.env['REDIS_URL']!).toString()),
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
    await (genericRedisCacheContext.redisClient as Redis).flushdb();
  });
  afterAll(async () => {
    (genericRedisCacheContext.redisClient as Redis).disconnect();
  });

  it('has correct caching behavior', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const genericCacher = viewerContext.entityCompanionProvider.getCompanionForEntity(
      RedisTestEntity,
    )['tableDataCoordinator']['cacheAdapter']['genericCacher'] as IEntityGenericCacher<
      RedisTestEntityFields,
      'id'
    >;

    const entity1Created = await RedisTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .createAsync();

    // loading an entity should put it in cache
    const entity1 = await RedisTestEntity.loader(viewerContext).loadByIDAsync(
      entity1Created.getID(),
    );

    const cachedSingleJSON = await (genericRedisCacheContext.redisClient as Redis).get(
      genericCacher.makeCacheKeyForStorage(
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder(entity1.getID()),
      ),
    );
    const cachedSingleValue = JSON.parse(cachedSingleJSON!);
    expect(cachedSingleValue).toMatchObject({
      id: entity1.getID(),
      name: 'blah',
    });

    // loading an entity by composite field should put it in cache
    const entity2 = await RedisTestEntity.loader(viewerContext).loadByCompositeFieldEqualingAsync(
      ['name', 'id'],
      { name: 'blah', id: entity1.getID() },
    );
    const cachedCompositeJSON = await (genericRedisCacheContext.redisClient as Redis).get(
      genericCacher.makeCacheKeyForStorage(
        new CompositeFieldHolder<RedisTestEntityFields, 'id'>(['id', 'name']),
        new CompositeFieldValueHolder({ id: entity2!.getID(), name: 'blah' }),
      ),
    );
    const cachedCompositeValue = JSON.parse(cachedCompositeJSON!);
    expect(cachedCompositeValue).toMatchObject({
      id: entity2!.getID(),
      name: 'blah',
    });

    // simulate non existent db fetch, should write negative result ('') to cache
    const nonExistentId = uuidv4();

    const entityNonExistentResult =
      await RedisTestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync(
        nonExistentId,
      );
    expect(entityNonExistentResult.ok).toBe(false);
    const nonExistentCachedValue = await (genericRedisCacheContext.redisClient as Redis).get(
      genericCacher.makeCacheKeyForStorage(
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder(nonExistentId),
      ),
    );
    expect(nonExistentCachedValue).toEqual('');

    const entityNonExistentCompositeResult = await RedisTestEntity.loader(
      viewerContext,
    ).loadByCompositeFieldEqualingAsync(['name', 'id'], { name: 'blah', id: nonExistentId });
    expect(entityNonExistentCompositeResult).toBe(null);
    const nonExistentCompositeCachedValue = await (
      genericRedisCacheContext.redisClient as Redis
    ).get(
      genericCacher.makeCacheKeyForStorage(
        new CompositeFieldHolder<RedisTestEntityFields, 'id'>(['id', 'name']),
        new CompositeFieldValueHolder({ id: nonExistentId, name: 'blah' }),
      ),
    );
    expect(nonExistentCompositeCachedValue).toEqual('');

    // load again through entities framework to ensure it reads negative result
    const entityNonExistentResult2 =
      await RedisTestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync(
        nonExistentId,
      );
    expect(entityNonExistentResult2.ok).toBe(false);
    const entityNonExistentCompositeResult2 = await RedisTestEntity.loader(
      viewerContext,
    ).loadByCompositeFieldEqualingAsync(['name', 'id'], { name: 'blah', id: nonExistentId });
    expect(entityNonExistentCompositeResult2).toBe(null);

    // invalidate from cache to ensure it invalidates correctly
    await RedisTestEntity.loaderUtils(viewerContext).invalidateFieldsAsync(entity1.getAllFields());
    const cachedValueNullKeys = genericCacher.makeCacheKeysForInvalidation(
      new SingleFieldHolder('id'),
      new SingleFieldValueHolder(entity1.getID()),
    );
    const cachedValueNull = await (genericRedisCacheContext.redisClient as Redis).mget(
      ...cachedValueNullKeys,
    );
    expect(cachedValueNull.every((c) => c === null)).toBe(true);

    const cachedValueNullCompositeKeys = genericCacher.makeCacheKeysForInvalidation(
      new CompositeFieldHolder<RedisTestEntityFields, 'id'>(['id', 'name']),
      new CompositeFieldValueHolder({ id: entity1.getID(), name: 'blah' }),
    );
    const cachedValueNullComposite = await (genericRedisCacheContext.redisClient as Redis).mget(
      ...cachedValueNullCompositeKeys,
    );
    expect(cachedValueNullComposite.every((c) => c === null)).toBe(true);
  });

  it('caches and restores date fields', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const date = new Date();
    const entity1 = await enforceAsyncResult(
      RedisTestEntity.creatorWithAuthorizationResults(viewerContext)
        .setField('dateField', date)
        .createAsync(),
    );
    expect(entity1.getField('dateField')).toEqual(date);

    const entity2 = await RedisTestEntity.loader(viewerContext).loadByIDAsync(entity1.getID());
    expect(entity2.getField('dateField')).toEqual(date);

    // simulate new request
    const vc2 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const entity3 = await RedisTestEntity.loader(vc2).loadByIDAsync(entity1.getID());
    expect(entity3.getField('dateField')).toEqual(date);
  });

  it('caches and restores empty string field keys', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const entity1 = await enforceAsyncResult(
      RedisTestEntity.creatorWithAuthorizationResults(viewerContext)
        .setField('name', '')
        .createAsync(),
    );
    const entity2 = await RedisTestEntity.loader(viewerContext).loadByFieldEqualingAsync(
      'name',
      '',
    );
    expect(entity2?.getID()).toEqual(entity1.getID());

    // simulate new request
    const vc2 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const entity3 = await RedisTestEntity.loader(vc2).loadByFieldEqualingAsync('name', '');
    expect(entity3?.getID()).toEqual(entity1.getID());
  });
});
