import {
  IEntityCacheAdapterProvider,
  EntityConfiguration,
  IEntityCacheAdapter,
  GenericEntityCacheAdapter,
} from '@expo/entity';

import GenericRedisCacher, { GenericRedisCacheContext } from './GenericRedisCacher';

export default class RedisCacheAdapterProvider implements IEntityCacheAdapterProvider {
  constructor(private readonly context: GenericRedisCacheContext) {}

  getCacheAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): IEntityCacheAdapter<TFields, TIDField> {
    return new GenericEntityCacheAdapter(new GenericRedisCacher(this.context, entityConfiguration));
  }
}
