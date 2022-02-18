import { RedisCacheAdapterContext } from '@expo/entity-cache-adapter-redis';
import invariant from 'invariant';

import ComposedPartsCacher from './ComposedPartsCacher';
import EntityConfiguration from './EntityConfiguration';
import PartsCacheAdapter from './PartsCacheAdapter';
import PartsCacher, { Parts } from './PartsCacher';

/**
 * TODO: put this in www
 */
export default class LocalMemoryAndRedisPartsCacheAdapter<
  TFields
> extends PartsCacheAdapter<TFields> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    localMemoryPartsCacher: PartsCacher<TFields>,
    redisPartsCacher: PartsCacher<TFields>,
    private readonly redisCacheAdapterContext: RedisCacheAdapterContext
  ) {
    super(
      entityConfiguration,
      new ComposedPartsCacher<TFields>([localMemoryPartsCacher, redisPartsCacher])
    );
  }

  /**
   * TODO: this seems wrong - look at moving the redis specific bits into the makeCacheSpecificKey of the SimplePartsCacher
   */
  getParts<N extends keyof TFields>(fieldName: N, fieldValue: NonNullable<TFields[N]>): Parts {
    const columnName = this.entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
    invariant(columnName, `database field mapping missing for ${fieldName}`);
    return [
      this.redisCacheAdapterContext.cacheKeyPrefix,
      this.entityConfiguration.tableName,
      `v2.${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue),
    ];
  }
}
