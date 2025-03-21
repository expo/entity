import invariant from 'invariant';

import IEntityCacheAdapter from './IEntityCacheAdapter';
import IEntityGenericCacher from './IEntityGenericCacher';
import { IEntityLoadKey, IEntityLoadValue } from './internal/EntityAdapterLoadInterfaces';
import { CacheLoadResult } from './internal/ReadThroughEntityCache';
import { mapKeys } from './utils/collections/maps';

/**
 * A standard IEntityCacheAdapter that coordinates caching through an IEntityGenericCacher.
 */
export default class GenericEntityCacheAdapter<TFields extends Record<string, any>>
  implements IEntityCacheAdapter<TFields>
{
  constructor(private readonly genericCacher: IEntityGenericCacher<TFields>) {}

  public async loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>> {
    const redisCacheKeyToFieldValueMapping = new Map(
      values.map((value) => [this.genericCacher.makeCacheKey(key, value), value]),
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
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>): Promise<void> {
    await this.genericCacher.cacheManyAsync(
      mapKeys(objectMap, (value) => this.genericCacher.makeCacheKey(key, value)),
    );
  }

  public async cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    await this.genericCacher.cacheDBMissesAsync(
      values.map((value) => this.genericCacher.makeCacheKey(key, value)),
    );
  }

  public async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    await this.genericCacher.invalidateManyAsync(
      values.map((value) => this.genericCacher.makeCacheKey(key, value)),
    );
  }
}
