# `@expo/entity-secondary-cache-redis`

[ioredis](https://github.com/luin/ioredis) secondary cache for `@expo/entity`.

[Documentation](https://expo.github.io/entity/modules/_expo_secondary_cache_redis.html)

## Usage

1. Create a concrete implementation of abstract class `EntitySecondaryCacheLoader`, in this example `TestEntitySecondaryCacheLoader`. The underlying data can come from anywhere, but an entity is constructed from the data and then authorized for the viewer.
2. Create an instance of your `EntitySecondaryCacheLoader`, passing in a `RedisSecondaryEntityCache`.
    ```typescript
    const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
      new RedisSecondaryEntityCache(
        redisTestEntityConfiguration,
        redisCacheAdapterContext,
        (loadParams) => `${loadParams.id}`
      ),
      RedisTestEntity.loader(vc1)
    );
    ```
3. Load entities through it:
    ```typescript
    const loadParams = { id: createdEntity.getID() };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    ```