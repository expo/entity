# `@expo/entity-cache-adapter-redis`

[ioredis](https://github.com/luin/ioredis) cache adapter for `@expo/entity`.

[Documentation](https://expo.github.io/entity/modules/_expo_entity_cache_adapter_redis.html)

## Usage

During `EntityCompanionProvider` instantiation:

```typescript
import Redis from 'ioredis';

const genericRedisCacherContext = {
  redisClient: new Redis(new URL(process.env['REDIS_URL']!).toString()),
  makeKeyFn(...parts: string[]): string {
    const delimiter = ':';
    const escapedParts = parts.map((part) =>
      part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
    );
    return escapedParts.join(delimiter);
  },
  cacheKeyPrefix: 'ent-',
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
      ['redis']: {
        cacheAdapterProvider: new RedisCacheAdapterProvider(genericRedisCacheContext),
      },
    }
  );
};
```