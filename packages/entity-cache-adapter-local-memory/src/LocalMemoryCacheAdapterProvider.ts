import {
  computeIfAbsent,
  EntityCacheAdapter,
  EntityConfiguration,
  IEntityCacheAdapterProvider,
} from '@expo/entity';

import GenericLocalMemoryCacher, { LocalMemoryCache } from './GenericLocalMemoryCacher';
import LocalMemoryCacheAdapter from './LocalMemoryCacheAdapter';

export default class LocalMemoryCacheAdapterProvider implements IEntityCacheAdapterProvider {
  // local memory cache adapters should be shared/reused across requests
  static localMemoryCacheAdapterMap = new Map<string, LocalMemoryCacheAdapter<any>>();

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
  ): EntityCacheAdapter<TFields> {
    return computeIfAbsent(
      LocalMemoryCacheAdapterProvider.localMemoryCacheAdapterMap,
      entityConfiguration.tableName,
      () => {
        const localMemoryCache = this.localMemoryCacheCreator<TFields>();
        return new LocalMemoryCacheAdapter(entityConfiguration, localMemoryCache);
      }
    );
  }
}
