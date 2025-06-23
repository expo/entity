import { EntityCacheAdapterTransientError, ViewerContext } from '@expo/entity';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import {
  GenericRedisCacheContext,
  GenericRedisCacher,
  RedisCacheInvalidationStrategy,
} from '../GenericRedisCacher';
import { Redis, StartedRedisContainer, startRedisAsync } from './testcontainer';
import { RedisTestEntity } from '../__testfixtures__/RedisTestEntity';
import { createRedisIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createRedisIntegrationTestEntityCompanionProvider';

class TestViewerContext extends ViewerContext {}

describe(GenericRedisCacher, () => {
  let container: StartedRedisContainer;
  let redisClient: Redis;
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(async () => {
    ({ container, redisClient } = await startRedisAsync());
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
      invalidationConfig: {
        invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
      },
    };
  });

  beforeEach(async () => {
    await redisClient.flushdb();
  });

  afterAll(async () => {
    await container.stop();
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
