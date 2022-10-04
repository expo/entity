import {
  IEntityCacheAdapterProvider,
  EntityConfiguration,
  IEntityCacheAdapter,
  GenericEntityCacheAdapter,
} from '@expo/entity';

import ShardedGenericRedisCacher, {
  ShardedRedisCacheAdapterContext,
} from './ShardedGenericRedisCacher';

export default class ShardedRedisCacheAdapterProvider implements IEntityCacheAdapterProvider {
  constructor(private readonly context: ShardedRedisCacheAdapterContext) {}

  getCacheAdapter<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): IEntityCacheAdapter<TFields> {
    const genericCacher = new ShardedGenericRedisCacher(this.context, entityConfiguration);
    return new GenericEntityCacheAdapter(genericCacher);
  }
}
