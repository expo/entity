import invariant from 'invariant';

import { EntityCompositeField } from './EntityConfiguration';
import IEntityCacheAdapter from './IEntityCacheAdapter';
import IEntityGenericCacher from './IEntityGenericCacher';
import { CompositeFieldValueHolder, CompositeFieldHolder } from './internal/CompositeFieldHolder';
import {
  CompositeFieldValueHolderMap,
  CompositeFieldValueHolderReadonlyMap,
} from './internal/CompositeFieldValueHolderMap';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';
import { mapKeys } from './utils/collections/maps';

/**
 * A standard IEntityCacheAdapter that coordinates caching through an IEntityGenericCacher.
 */
export default class GenericEntityCacheAdapter<TFields extends Record<string, any>>
  implements IEntityCacheAdapter<TFields>
{
  constructor(private readonly genericCacher: IEntityGenericCacher<TFields>) {}

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const redisCacheKeyToFieldValueMapping = new Map(
      fieldValues.map((fieldValue) => [
        this.genericCacher.makeCacheKey(fieldName, fieldValue),
        fieldValue,
      ]),
    );
    const cacheResults = await this.genericCacher.loadManyAsync(
      Array.from(redisCacheKeyToFieldValueMapping.keys()),
    );

    return mapKeys(cacheResults, (redisCacheKey) => {
      const fieldValue = redisCacheKeyToFieldValueMapping.get(redisCacheKey);
      invariant(
        fieldValue !== undefined,
        'Unspecified cache key %s returned from generic cacher',
        redisCacheKey,
      );
      return fieldValue;
    });
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>,
  ): Promise<void> {
    await this.genericCacher.cacheManyAsync(
      mapKeys(objectMap, (fieldValue) => this.genericCacher.makeCacheKey(fieldName, fieldValue)),
    );
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {
    await this.genericCacher.cacheDBMissesAsync(
      fieldValues.map((fieldValue) => this.genericCacher.makeCacheKey(fieldName, fieldValue)),
    );
  }

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {
    await this.genericCacher.invalidateManyAsync(
      fieldValues.map((fieldValue) => this.genericCacher.makeCacheKey(fieldName, fieldValue)),
    );
  }

  public async loadManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<CompositeFieldValueHolderReadonlyMap<TFields, N, CacheLoadResult<TFields>>> {
    const redisCacheKeyToCompositeFieldValueMapping = new Map(
      compositeFieldValueHolders.map((compositeFieldValueHolder) => [
        this.genericCacher.makeCompositeFieldCacheKey(
          compositeFieldHolder,
          compositeFieldValueHolder,
        ),
        compositeFieldValueHolder,
      ]),
    );
    const cacheResults = await this.genericCacher.loadManyAsync(
      Array.from(redisCacheKeyToCompositeFieldValueMapping.keys()),
    );

    return new CompositeFieldValueHolderMap(
      mapKeys(cacheResults, (redisCacheKey) => {
        const compositeFieldValue = redisCacheKeyToCompositeFieldValueMapping.get(redisCacheKey);
        invariant(
          compositeFieldValue !== undefined,
          'Unspecified cache key %s returned from generic cacher',
          redisCacheKey,
        );
        return compositeFieldValue;
      }),
    );
  }

  public async cacheManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    objectMap: CompositeFieldValueHolderReadonlyMap<TFields, N, Readonly<TFields>>,
  ): Promise<void> {
    await this.genericCacher.cacheManyAsync(
      mapKeys(objectMap, (compositeFieldValueHolder) =>
        this.genericCacher.makeCompositeFieldCacheKey(
          compositeFieldHolder,
          compositeFieldValueHolder,
        ),
      ),
    );
  }

  public async cacheCompositeFieldDBMissesAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {
    await this.genericCacher.cacheDBMissesAsync(
      compositeFieldValueHolders.map((compositeFieldValueHolder) =>
        this.genericCacher.makeCompositeFieldCacheKey(
          compositeFieldHolder,
          compositeFieldValueHolder,
        ),
      ),
    );
  }

  public async invalidateManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {
    await this.genericCacher.invalidateManyAsync(
      compositeFieldValueHolders.map((compositeFieldValueHolder) =>
        this.genericCacher.makeCompositeFieldCacheKey(
          compositeFieldHolder,
          compositeFieldValueHolder,
        ),
      ),
    );
  }
}
