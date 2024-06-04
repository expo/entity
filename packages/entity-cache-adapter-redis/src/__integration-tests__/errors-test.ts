import { EntityCacheAdapterTransientError, ViewerContext } from '@expo/entity';
import Redis from 'ioredis';
import { URL } from 'url';

import GenericRedisCacher, { GenericRedisCacheContext } from '../GenericRedisCacher';
import RedisTestEntity from '../testfixtures/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../testfixtures/createRedisIntegrationTestEntityCompanionProvider';

class TestViewerContext extends ViewerContext {}

describe(GenericRedisCacher, () => {
  const redisClient = new Redis(new URL(process.env['REDIS_URL']!).toString());
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(() => {
    genericRedisCacheContext = {
      redisClient,
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
    };
  });

  beforeEach(async () => {
    await redisClient.flushdb();
  });

  it('throws when redis is disconnected', async () => {
    redisClient.disconnect();

    const vc1 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );

    await expect(
      RedisTestEntity.creator(vc1).setField('name', 'blah').enforceCreateAsync(),
    ).rejects.toThrow(EntityCacheAdapterTransientError);
  });
});
