import { EntitySecondaryCacheLoader, mapMapAsync, ViewerContext } from '@expo/entity';
import { RedisCacheAdapterContext } from '@expo/entity-cache-adapter-redis';
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

class TestSecondaryRedisCacheLoader extends EntitySecondaryCacheLoader<
  TestLoadParams,
  RedisTestEntityFields,
  string,
  TestViewerContext,
  RedisTestEntity,
  RedisTestEntityPrivacyPolicy
> {
  public loadCount = 0;

  protected async fetchObjectsFromDatabaseAsync(
    loadParamsArray: readonly Readonly<TestLoadParams>[]
  ): Promise<ReadonlyMap<Readonly<TestLoadParams>, Readonly<RedisTestEntityFields>>> {
    this.loadCount += loadParamsArray.length;

    const emptyMap = new Map(loadParamsArray.map((p) => [p, null]));
    return await mapMapAsync(emptyMap, async (_value, loadParams) => {
      return (
        await this.entityLoader
          .enforcing()
          .loadManyByFieldEqualityConjunctionAsync([{ fieldName: 'id', fieldValue: loadParams.id }])
      )[0].getAllFields();
    });
  }
}

describe(RedisSecondaryEntityCache, () => {
  let redisCacheAdapterContext: RedisCacheAdapterContext;

  beforeAll(() => {
    redisCacheAdapterContext = {
      redisClient: new Redis(new URL(process.env.REDIS_URL!).toString()),
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

  it('Loads through secondary loader, caches, and invalidates', async () => {
    const vc1 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );

    const createdEntity = await RedisTestEntity.creator(vc1)
      .setField('name', 'wat')
      .enforceCreateAsync();

    const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
      new RedisSecondaryEntityCache(
        redisTestEntityConfiguration,
        redisCacheAdapterContext,
        (loadParams) => `test-key-${loadParams.id}`
      ),
      RedisTestEntity.loader(vc1)
    );

    const loadParams = { id: createdEntity.getID() };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID()
    );

    expect(secondaryCacheLoader.loadCount).toEqual(1);

    const results2 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results2.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID()
    );

    expect(secondaryCacheLoader.loadCount).toEqual(1);

    await secondaryCacheLoader.invalidateManyAsync([loadParams]);

    const results3 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results3.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID()
    );

    expect(secondaryCacheLoader.loadCount).toEqual(2);
  });
});
