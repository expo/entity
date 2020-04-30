import { IEntityCacheAdapterProvider, EntityConfiguration, EntityCacheAdapter } from '@expo/entity';

import RedisCacheAdapter, { RedisCacheAdapterContext } from './RedisCacheAdapter';

export default class RedisCacheAdapterProvider implements IEntityCacheAdapterProvider {
  constructor(private readonly context: RedisCacheAdapterContext) {}

  getCacheAdapter<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityCacheAdapter<TFields> {
    return new RedisCacheAdapter(entityConfiguration, this.context);
  }
}
