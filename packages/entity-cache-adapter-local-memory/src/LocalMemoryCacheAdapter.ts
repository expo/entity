import { EntityConfiguration, PartsCacheAdapter, Parts } from '@expo/entity';
import SimplePartsCacher from '@expo/entity/build/SimplePartsCacher';
import invariant from 'invariant';

import GenericLocalMemoryCacher, { LocalMemoryCache } from './GenericLocalMemoryCacher';

export default class LocalMemoryCacheAdapter<TFields> extends PartsCacheAdapter<TFields> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    localMemoryCache: LocalMemoryCache<TFields>
  ) {
    super(
      entityConfiguration,
      new SimplePartsCacher(new GenericLocalMemoryCacher(localMemoryCache))
    );
  }

  getParts<N extends keyof TFields>(fieldName: N, fieldValue: NonNullable<TFields[N]>): Parts {
    const columnName = this.entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
    invariant(columnName, `database field mapping missing for ${fieldName}`);
    return [
      this.entityConfiguration.tableName,
      `${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue),
    ];
  }
}
