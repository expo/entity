import { EntityCacheAdapterTransientError, ViewerContext } from '@expo/entity';
import Redis from 'ioredis';
import { URL } from 'url';

import RedisCacheAdapter, { RedisCacheAdapterContext } from '../RedisCacheAdapter';
import RedisTestEntity from '../testfixtures/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../testfixtures/createRedisIntegrationTestEntityCompanionProvider';

class TestViewerContext extends ViewerContext {}

describe(RedisCacheAdapter, () => {
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

  it('throws when redis is disconnected', async () => {
    redisCacheAdapterContext.redisClient.disconnect();

    const vc1 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(redisCacheAdapterContext)
    );

    await expect(
      RedisTestEntity.creator(vc1).setField('name', 'blah').enforceCreateAsync()
    ).rejects.toThrow(EntityCacheAdapterTransientError);
  });
});
