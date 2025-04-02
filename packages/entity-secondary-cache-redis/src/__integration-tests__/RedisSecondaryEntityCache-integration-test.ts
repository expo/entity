import { EntitySecondaryCacheLoader, mapMapAsync, ViewerContext } from '@expo/entity';
import {
  GenericRedisCacheContext,
  RedisCacheInvalidationStrategy,
} from '@expo/entity-cache-adapter-redis';
import Redis from 'ioredis';
import nullthrows from 'nullthrows';
import { URL } from 'url';

import RedisSecondaryEntityCache from '../RedisSecondaryEntityCache';
import RedisTestEntity, {
  redisTestEntityConfiguration,
  RedisTestEntityFields,
  RedisTestEntityPrivacyPolicy,
} from '../testfixtures/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../testfixtures/createRedisIntegrationTestEntityCompanionProvider';

class TestViewerContext extends ViewerContext {}

type TestLoadParams = { id: string };

const FAKE_ID = 'fake';

class TestSecondaryRedisCacheLoader extends EntitySecondaryCacheLoader<
  TestLoadParams,
  RedisTestEntityFields,
  string,
  TestViewerContext,
  RedisTestEntity,
  RedisTestEntityPrivacyPolicy
> {
  public databaseLoadCount = 0;

  protected async fetchObjectsFromDatabaseAsync(
    loadParamsArray: readonly Readonly<TestLoadParams>[],
  ): Promise<ReadonlyMap<Readonly<TestLoadParams>, Readonly<RedisTestEntityFields> | null>> {
    this.databaseLoadCount += loadParamsArray.length;

    const emptyMap = new Map(loadParamsArray.map((p) => [p, null]));
    return await mapMapAsync(emptyMap, async (_value, loadParams) => {
      if (loadParams.id === FAKE_ID) {
        return null;
      }
      return nullthrows(
        (
          await this.entityLoader.loadManyByFieldEqualityConjunctionAsync([
            { fieldName: 'id', fieldValue: loadParams.id },
          ])
        )[0],
      )
        .enforceValue()
        .getAllFields();
    });
  }
}

describe(RedisSecondaryEntityCache, () => {
  const redisClient = new Redis(new URL(process.env['REDIS_URL']!).toString());
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(() => {
    genericRedisCacheContext = {
      redisClient,
      makeKeyFn(..._parts: string[]): string {
        throw new Error('should not be used by this test');
      },
      cacheKeyPrefix: 'test-',
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
      invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
    };
  });

  beforeEach(async () => {
    await redisClient.flushdb();
  });
  afterAll(async () => {
    redisClient.disconnect();
  });

  it('Loads through secondary loader, caches, and invalidates', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );

    const createdEntity = await RedisTestEntity.creator(viewerContext)
      .setField('name', 'wat')
      .createAsync();

    const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
      new RedisSecondaryEntityCache(
        redisTestEntityConfiguration,
        genericRedisCacheContext,
        (loadParams) => `test-key-${loadParams.id}`,
      ),
      RedisTestEntity.loaderWithAuthorizationResults(viewerContext),
    );

    const loadParams = { id: createdEntity.getID() };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(1);

    const results2 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results2.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(1);

    await secondaryCacheLoader.invalidateManyAsync([loadParams]);

    const results3 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results3.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(2);
  });

  it('correctly handles uncached and unfetchable load params', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );

    const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
      new RedisSecondaryEntityCache(
        redisTestEntityConfiguration,
        genericRedisCacheContext,
        (loadParams) => `test-key-${loadParams.id}`,
      ),
      RedisTestEntity.loaderWithAuthorizationResults(viewerContext),
    );

    const loadParams = { id: FAKE_ID };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(results.size).toBe(1);
    expect(results.get(loadParams)).toBe(null);
  });
});
