import { EntityCacheAdapter, CacheLoadResult, EntityConfiguration, mapKeys } from '@expo/entity';
import invariant from 'invariant';

import GenericLocalMemoryCacher, { LocalMemoryCache } from './GenericLocalMemoryCacher';

export default class LocalMemoryCacheAdapter<TFields> extends EntityCacheAdapter<TFields> {
  private readonly genericLocalMemoryCacher: GenericLocalMemoryCacher<TFields>;

  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    localMemoryCache: LocalMemoryCache<TFields>
  ) {
    super(entityConfiguration);
    this.genericLocalMemoryCacher = new GenericLocalMemoryCacher(localMemoryCache);
  }

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const localMemoryCacheKeyToFieldValueMapping = new Map(
      fieldValues.map((fieldValue) => [this.makeCacheKey(fieldName, fieldValue), fieldValue])
    );
    const cacheResults = await this.genericLocalMemoryCacher.loadManyAsync(
      Array.from(localMemoryCacheKeyToFieldValueMapping.keys())
    );

    return mapKeys(cacheResults, (cacheKey) => {
      const fieldValue = localMemoryCacheKeyToFieldValueMapping.get(cacheKey);
      invariant(
        fieldValue !== undefined,
        'Unspecified cache key %s returned from generic local memory cacher',
        cacheKey
      );
      return fieldValue;
    });
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void> {
    await this.genericLocalMemoryCacher.cacheManyAsync(
      mapKeys(objectMap, (fieldValue) => this.makeCacheKey(fieldName, fieldValue))
    );
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    await this.genericLocalMemoryCacher.cacheDBMissesAsync(
      fieldValues.map((fieldValue) => this.makeCacheKey(fieldName, fieldValue))
    );
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    await this.genericLocalMemoryCacher.invalidateManyAsync(
      fieldValues.map((fieldValue) => this.makeCacheKey(fieldName, fieldValue))
    );
  }

  private makeCacheKey<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): string {
    const columnName = this.entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
    invariant(columnName, `database field mapping missing for ${fieldName}`);
    const parts = [
      this.entityConfiguration.tableName,
      `${this.entityConfiguration.cacheKeyVersion}`,
      columnName,
      String(fieldValue),
    ];
    return this.genericLocalMemoryCacher.makeCacheKey(parts);
  }
}
