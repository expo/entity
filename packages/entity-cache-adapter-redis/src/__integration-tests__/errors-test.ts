import { EntityCacheAdapterTransientError, ViewerContext } from '@expo/entity';
import { beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import Redis from 'ioredis';
import { URL } from 'url';

import {
  GenericRedisCacheContext,
  GenericRedisCacher,
  RedisCacheInvalidationStrategy,
} from '../GenericRedisCacher';
import { RedisTestEntity } from '../__testfixtures__/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createRedisIntegrationTestEntityCompanionProvider';

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
          part.replaceAll('\\', '\\\\').replaceAll(delimiter, `\\${delimiter}`),
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

  it('throws when redis is disconnected', async () => {
    redisClient.disconnect();

    const vc1 = new TestViewerContext(
      createRedisIntegrationTestEntityCompanionProvider(genericRedisCacheContext),
    );

    await expect(
      RedisTestEntity.creator(vc1).setField('name', 'blah').createAsync(),
    ).rejects.toThrow(EntityCacheAdapterTransientError);
  });
});
