import {
  computeIfAbsent,
  EntityConfiguration,
  GenericEntityCacheAdapter,
  IEntityCacheAdapter,
  IEntityCacheAdapterProvider,
} from '@expo/entity';

import { GenericLocalMemoryCacher, ILocalMemoryCache } from './GenericLocalMemoryCacher';

export type LocalMemoryCacheCreator = <
  TFields extends Record<string, any>,
>() => ILocalMemoryCache<TFields>;
/**
 * Vends local memory cache adapters. An instance of this class may be shared across requests to
 * share the local memory cache.
 */
export class LocalMemoryCacheAdapterProvider implements IEntityCacheAdapterProvider {
  /**
   * @returns a no-op local memory cache adapter provider, or one that doesn't cache at all.
   */
  static createNoOpProvider(): IEntityCacheAdapterProvider {
    return new LocalMemoryCacheAdapterProvider(<TFields extends Record<string, any>>() =>
      GenericLocalMemoryCacher.createNoOpCache<TFields>(),
    );
  }

  /**
   * @returns a local memory cache adapter provider configured with the supplied local memory cache creator function.
   */
  static createProviderWithCacheCreator(
    cacheCreator: LocalMemoryCacheCreator,
  ): IEntityCacheAdapterProvider {
    return new LocalMemoryCacheAdapterProvider(cacheCreator);
  }

  private readonly localMemoryCacheAdapterMap = new Map<
    string,
    GenericEntityCacheAdapter<any, any>
  >();

  private constructor(private readonly localMemoryCacheCreator: LocalMemoryCacheCreator) {}

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
