import {
  computeIfAbsent,
  IEntityCacheAdapter,
  GenericEntityCacheAdapter,
  EntityConfiguration,
  IEntityCacheAdapterProvider,
} from '@expo/entity';

import GenericLocalMemoryCacher, { LocalMemoryCache } from './GenericLocalMemoryCacher';

export default class LocalMemoryCacheAdapterProvider implements IEntityCacheAdapterProvider {
  // local memory cache adapters should be shared/reused across requests
  private static localMemoryCacheAdapterMap = new Map<string, GenericEntityCacheAdapter<any>>();

  static getNoOpProvider(): IEntityCacheAdapterProvider {
    return new LocalMemoryCacheAdapterProvider(<TFields>() =>
      GenericLocalMemoryCacher.createNoOpCache<TFields>()
    );
  }

  static getProvider(
    options: { maxSize?: number; ttlSeconds?: number } = {}
  ): IEntityCacheAdapterProvider {
    return new LocalMemoryCacheAdapterProvider(<TFields>() =>
      GenericLocalMemoryCacher.createLRUCache<TFields>(options)
    );
  }

  private constructor(
    private readonly localMemoryCacheCreator: <TFields>() => LocalMemoryCache<TFields>
  ) {}

  public getCacheAdapter<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): IEntityCacheAdapter<TFields> {
    return computeIfAbsent(
      LocalMemoryCacheAdapterProvider.localMemoryCacheAdapterMap,
      entityConfiguration.tableName,
      () => {
        const localMemoryCache = this.localMemoryCacheCreator<TFields>();
        return new GenericEntityCacheAdapter(
          new GenericLocalMemoryCacher(entityConfiguration, localMemoryCache)
        );
      }
    );
  }
}
