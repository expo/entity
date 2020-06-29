import { IEntityCacheAdapterProvider, EntityConfiguration, EntityCacheAdapter } from '@expo/entity';

import RedisCacheAdapter, { RedisCacheAdapterContext } from './RedisCacheAdapter';

export default class RedisCacheAdapterProvider implements IEntityCacheAdapterProvider {
  constructor(private readonly context: RedisCacheAdapterContext) {}

  getCacheAdapter<TDatabaseFields>(
    entityConfiguration: EntityConfiguration<TDatabaseFields>
  ): EntityCacheAdapter<TDatabaseFields> {
    return new RedisCacheAdapter(entityConfiguration, this.context);
  }
}
