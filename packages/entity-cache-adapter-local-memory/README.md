# `@expo/entity-cache-adapter-local-memory`

Cross-request [LRU](https://github.com/isaacs/node-lru-cache) cache adapter for `@expo/entity`. Use
this cache with caution - it is nonstandard. The cache is shared between requests in the node process.

Note: This uses version 6.0.0 of `node-lru-cache` since it the most tuned version for our use case (low TTL + LRU). Upgrading
to 7.x will cause high memory usage for the entity cache adapter use case since it allocates fixed-size data structures up front to tune for the non-TTL use case: https://github.com/isaacs/node-lru-cache/issues/208.

[Documentation](https://expo.github.io/entity/modules/_expo_cache_adapter_local_memory.html)

## Why NOT use this cache

Because this is an in-memory cache, cross-machine invalidation is not possible. Do not use this cache
if you have the following use cases:

- The objects stored are mutable
- Reading a stale object from the cache is not acceptable in your application
- Cross-machine invalidation is not possible

## Typical use cases

If your application sees many requests fetching the same objects, you can save a trip to your cache
cluster and backing datastore by using this in-memory cache. Here are some good use cases:

- The objects stored are mostly immutable, and reading a stale object for a short TTL is acceptable
- You have a low TTL setting in your cache

## Usage

During `EntityCompanionProvider` instantiation:

```typescript
export const createDefaultEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    {
      ...
    },
    {
      ['local-memory']: {
        cacheAdapterProvider: new LocalMemoryCacheAdapterProvider.getProvider(),
      },
    }
  );
};

```
