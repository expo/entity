import {
  IEntityCacheAdapterProvider,
  EntityConfiguration,
  IEntityCacheAdapter,
  GenericEntityCacheAdapter,
} from '@expo/entity';

import GenericRedisCacher, { RedisCacheAdapterContext } from './GenericRedisCacher';

export default class RedisCacheAdapterProvider implements IEntityCacheAdapterProvider {
  constructor(private readonly context: RedisCacheAdapterContext) {}

  getCacheAdapter<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): IEntityCacheAdapter<TFields> {
    const genericCacher = new GenericRedisCacher(this.context, entityConfiguration);
    return new GenericEntityCacheAdapter(genericCacher);
  }
}
