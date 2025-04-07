import { CacheStatus, ViewerContext } from '@expo/entity';
import Redis from 'ioredis';
import { URL } from 'url';

import GenericRedisCacher, {
  GenericRedisCacheContext,
  RedisCacheInvalidationStrategy,
} from '../GenericRedisCacher';
import RedisTestEntity, {
  redisTestEntityConfiguration,
  RedisTestEntityFields,
} from '../__testfixtures__/RedisTestEntity';
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
      invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
    };
  });

  beforeEach(async () => {
    await (genericRedisCacheContext.redisClient as Redis).flushdb();
  });
  afterAll(async () => {
    (genericRedisCacheContext.redisClient as Redis).disconnect();
  });

  it('has correct caching and loading behavior', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const genericRedisCacher = new GenericRedisCacher(
      genericRedisCacheContext,
      redisTestEntityConfiguration,
    );
    const date = new Date();
    const entity1Created = await RedisTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .createAsync();
    const testKey = `test-id-key-${entity1Created.getID()}`;
    const objectMap = new Map<string, Readonly<RedisTestEntityFields>>([
      [testKey, entity1Created.getAllFields()],
    ]);
    await genericRedisCacher.cacheManyAsync(objectMap);

    const cachedJSON = await (genericRedisCacheContext.redisClient as Redis).get(testKey);
    const cachedValue = JSON.parse(cachedJSON!);
    expect(cachedValue).toMatchObject({
      id: entity1Created.getID(),
      dateField: date.toISOString(),
    });

    const loadedObjectMap = await genericRedisCacher.loadManyAsync([testKey]);
    const cacheLoadResult = loadedObjectMap.get(testKey)!;
    expect(cacheLoadResult).toMatchObject({
      status: CacheStatus.HIT,
      item: entity1Created.getAllFields(),
    });
    expect(loadedObjectMap.size).toBe(1);
  });
  it('has correct negative caching behaviour', async () => {
    const genericRedisCacher = new GenericRedisCacher(
      genericRedisCacheContext,
      redisTestEntityConfiguration,
    );

    const testKey = `test-id-key-non-existent-id`;
    await genericRedisCacher.cacheDBMissesAsync([testKey]);
    const loadedObjectMap = await genericRedisCacher.loadManyAsync([testKey]);
    const cacheLoadResult = loadedObjectMap.get(testKey)!;
    expect(cacheLoadResult.status).toBe(CacheStatus.NEGATIVE);
  });
  it('has correct invalidation behaviour', async () => {
    const viewerContext = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );
    const genericRedisCacher = new GenericRedisCacher(
      genericRedisCacheContext,
      redisTestEntityConfiguration,
    );
    const date = new Date();
    const entity1Created = await RedisTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .createAsync();
    const testKey = `test-id-key-${entity1Created.getID()}`;
    const objectMap = new Map<string, Readonly<RedisTestEntityFields>>([
      [testKey, entity1Created.getAllFields()],
    ]);
    await genericRedisCacher.cacheManyAsync(objectMap);

    await genericRedisCacher.invalidateManyAsync([testKey]);

    const loadedObjectMap = await genericRedisCacher.loadManyAsync([testKey]);
    const cacheLoadResult = loadedObjectMap.get(testKey)!;
    expect(cacheLoadResult.status).toBe(CacheStatus.MISS);
  });
});
