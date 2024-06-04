import {
  IEntityCacheAdapterProvider,
  EntityConfiguration,
  IEntityCacheAdapter,
  GenericEntityCacheAdapter,
} from '@expo/entity';

import GenericRedisCacher, { GenericRedisCacheContext } from './GenericRedisCacher';

export default class RedisCacheAdapterProvider implements IEntityCacheAdapterProvider {
  constructor(private readonly context: GenericRedisCacheContext) {}

  getCacheAdapter<TFields extends Record<string, any>>(
    entityConfiguration: EntityConfiguration<TFields>,
  ): IEntityCacheAdapter<TFields> {
    return new GenericEntityCacheAdapter(new GenericRedisCacher(this.context, entityConfiguration));
  }
}
