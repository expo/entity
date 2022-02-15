# `@expo/entity-cache-adapter-local-memory`

Cross request [LRU](https://github.com/isaacs/node-lru-cache) cache adapter for `@expo/entity`.

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
