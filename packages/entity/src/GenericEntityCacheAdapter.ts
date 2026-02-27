import invariant from 'invariant';

import { IEntityLoadKey, IEntityLoadValue } from './EntityLoadInterfaces';
import { CacheLoadResult, IEntityCacheAdapter } from './IEntityCacheAdapter';
import { IEntityGenericCacher } from './IEntityGenericCacher';
import { mapKeys } from './utils/collections/maps';

/**
 * A standard IEntityCacheAdapter that coordinates caching through an IEntityGenericCacher.
 */
export class GenericEntityCacheAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityCacheAdapter<TFields, TIDField> {
  constructor(private readonly genericCacher: IEntityGenericCacher<TFields, TIDField>) {}

  public async loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>> {
    const redisCacheKeyToFieldValueMapping = new Map(
      values.map((value) => [this.genericCacher.makeCacheKeyForStorage(key, value), value]),
    );
    const cacheResults = await this.genericCacher.loadManyAsync(
      Array.from(redisCacheKeyToFieldValueMapping.keys()),
    );

    const result = key.vendNewLoadValueMap<CacheLoadResult<TFields>>();
    for (const [redisCacheKey, cacheResult] of cacheResults) {
      const fieldValue = redisCacheKeyToFieldValueMapping.get(redisCacheKey);
      invariant(
        fieldValue !== undefined,
        'Unspecified cache key %s returned from generic cacher',
        redisCacheKey,
      );
      result.set(fieldValue, cacheResult);
    }
    return result;
  }

  public async cacheManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>): Promise<void> {
    await this.genericCacher.cacheManyAsync(
      mapKeys(objectMap, (value) => this.genericCacher.makeCacheKeyForStorage(key, value)),
    );
  }

  public async cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    await this.genericCacher.cacheDBMissesAsync(
      values.map((value) => this.genericCacher.makeCacheKeyForStorage(key, value)),
    );
  }

  public async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    await this.genericCacher.invalidateManyAsync(
      values.flatMap((value) => this.genericCacher.makeCacheKeysForInvalidation(key, value)),
    );
  }
}
