import invariant from 'invariant';

import EntityCacheAdapter from './EntityCacheAdapter';
import EntityConfiguration from './EntityConfiguration';
import PartsCacher, { Parts } from './PartsCacher';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';
import { mapKeys } from './utils/collections/maps';

export default abstract class PartsCacheAdapter<TFields> extends EntityCacheAdapter<TFields> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    private readonly partsCacher: PartsCacher<TFields>
  ) {
    super(entityConfiguration);
  }

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const partsList = fieldValues.map((fieldValue) => this.getParts(fieldName, fieldValue));
    const partsKeysToFieldValueMapping = new Map(
      fieldValues.map((fieldValue) => {
        const parts = this.getParts(fieldName, fieldValue);
        return [PartsCacher.getPartsKey(...parts), fieldValue];
      })
    );
    const cacheResults = await this.partsCacher.loadManyAsync(partsList);

    return mapKeys(cacheResults, (partsKey) => {
      const fieldValue = partsKeysToFieldValueMapping.get(partsKey);
      invariant(
        fieldValue !== undefined,
        'Unspecified cache key %s returned from Redis parts cacher',
        partsKey
      );
      return fieldValue;
    });
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void> {
    const partsKeyToObject = mapKeys(objectMap, (fieldValue) => {
      const parts = this.getParts(fieldName, fieldValue);
      return PartsCacher.getPartsKey(...parts);
    });
    await this.partsCacher.cacheManyAsync(partsKeyToObject);
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    await this.partsCacher.cacheDBMissesAsync(
      fieldValues.map((fieldValue) => this.getParts(fieldName, fieldValue))
    );
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    await this.partsCacher.invalidateManyAsync(
      fieldValues.map((fieldValue) => this.getParts(fieldName, fieldValue))
    );
  }

  abstract getParts<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): Parts;
}
