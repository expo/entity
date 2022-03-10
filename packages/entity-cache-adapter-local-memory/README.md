# `@expo/entity-cache-adapter-local-memory`

Cross-request [LRU](https://github.com/isaacs/node-lru-cache) cache adapter for `@expo/entity`. Use
this cache with caution - it is nonstandard. The cache is shared between requests in the node process.

[Documentation](https://expo.github.io/entity/modules/_expo_cache_adapter_local_memory.html)

## Why NOT use this cache

Because this is an in-memory cache, cross-box invalidation is not possible. Do not use this cache
if you have the following use cases:

- The objects stored have high mutability
- Reading a stale object from the cache is not acceptable in your application
- Cross-box invalidation is not possible

## Typical use cases

If your application sees many requests fetching the same objects, you can save a trip to your cache
cluster and backing datastore by using this in-memory cache. Here are some good use cases:

- The objects stored are mostly immutable
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
