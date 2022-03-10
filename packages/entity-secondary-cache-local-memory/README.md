# `@expo/entity-secondary-cache-local-memory`

Cross-request [LRU](https://github.com/isaacs/node-lru-cache) secondary cache for `@expo/entity`. Use
this cache with caution - it is nonstandard. The cache is shared between requests in the node process.

[Documentation](https://expo.github.io/entity/modules/_expo_secondary_cache_local_memory.html)

## Usage

1. Create a concrete implementation of abstract class `EntitySecondaryCacheLoader`, in this example `TestEntitySecondaryCacheLoader`. The underlying data can come from anywhere, but an entity is constructed from the data and then authorized for the viewer.
2. Create an instance of your `EntitySecondaryCacheLoader`, passing in a `LocalMemorySecondaryEntityCache`.
    ```typescript
    const secondaryCacheLoader = new TestSecondaryLocalMemoryCacheLoader(
      new LocalMemorySecondaryEntityCache(
        GenericLocalMemoryCacher.createLRUCache<LocalMemoryTestEntityFields>({})
      ),
      LocalMemoryTestEntity.loader(viewerContext)
    );
    ```
3. Load entities through it:
    ```typescript
    const loadParams = { id: createdEntity.getID() };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    ```