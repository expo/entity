# @expo/entity-cache-adapter-redis

[https://github.com/luin/ioredis](ioredis) cache adapter for @expo/entity.

## Usage

During `EntityCompanionProvider` instantiation:

```typescript
import Redis from 'ioredis';

const redisCacheAdapterContext = {
  redisClient: new Redis(new URL(process.env.REDIS_URL!).toString()),
  makeKeyFn(...parts: string[]): string {
    const delimiter = ':';
    const escapedParts = parts.map((part) =>
      part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
    );
    return escapedParts.join(delimiter);
  },
  cacheKeyPrefix: 'ent-',
  cacheKeyVersion: 1,
  ttlSecondsPositive: 86400, // 1 day
  ttlSecondsNegative: 600, // 10 minutes
};

export const createDefaultEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    {
      ...
    },
    {
      [CacheAdapterFlavor.REDIS]: {
        cacheAdapterProvider: new RedisCacheAdapterProvider(redisCacheAdapterContext),
      },
    }
  );
};
```