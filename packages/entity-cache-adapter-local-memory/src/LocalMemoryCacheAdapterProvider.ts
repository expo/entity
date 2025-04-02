import {
  computeIfAbsent,
  IEntityCacheAdapter,
  EntityConfiguration,
  GenericEntityCacheAdapter,
  IEntityCacheAdapterProvider,
} from '@expo/entity';

import GenericLocalMemoryCacher, { LocalMemoryCache } from './GenericLocalMemoryCacher';

/**
 * Vends local memory cache adapters. An instance of this class may be shared across requests to
 * share the local memory cache.
 */
export default class LocalMemoryCacheAdapterProvider implements IEntityCacheAdapterProvider {
  /**
   * @returns a no-op local memory cache adapter provider, or one that doesn't cache locally.
   */
  static createNoOpProvider(): IEntityCacheAdapterProvider {
    return new LocalMemoryCacheAdapterProvider(<TFields extends Record<string, any>>() =>
      GenericLocalMemoryCacher.createNoOpCache<TFields>(),
    );
  }

  /**
   * @returns a local memory cache adapter provider configured with the supplied options.
   */
  static createProviderWithOptions(
    options: { maxSize?: number; ttlSeconds?: number } = {},
  ): IEntityCacheAdapterProvider {
    return new LocalMemoryCacheAdapterProvider(<TFields extends Record<string, any>>() =>
      GenericLocalMemoryCacher.createLRUCache<TFields>(options),
    );
  }

  private readonly localMemoryCacheAdapterMap = new Map<
    string,
    GenericEntityCacheAdapter<any, any>
  >();

  private constructor(
    private readonly localMemoryCacheCreator: <
      TFields extends Record<string, any>,
    >() => LocalMemoryCache<TFields>,
  ) {}

  public getCacheAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): IEntityCacheAdapter<TFields, TIDField> {
    return computeIfAbsent(this.localMemoryCacheAdapterMap, entityConfiguration.tableName, () => {
      const localMemoryCache = this.localMemoryCacheCreator<TFields>();
      return new GenericEntityCacheAdapter(
        new GenericLocalMemoryCacher(entityConfiguration, localMemoryCache),
      );
    });
  }
}
