import {
  EntityConfiguration,
  IEntityGenericCacher,
  type CacheLoadResult,
  CacheStatus,
  type IEntityLoadKey,
  type IEntityLoadValue,
} from '@expo/entity';

// Sentinel value we store in local memory to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
export const DOES_NOT_EXIST_LOCAL_MEMORY_CACHE = Symbol('doesNotExist');

/**
 * Type of value stored in the local memory cache. This is either the cached fields, or the
 * DOES_NOT_EXIST_LOCAL_MEMORY_CACHE sentinel value.
 */
export type LocalMemoryCacheValue<TFields extends Record<string, any>> =
  | Readonly<TFields>
  | typeof DOES_NOT_EXIST_LOCAL_MEMORY_CACHE;

/**
 * Interface for a local memory cache used by GenericLocalMemoryCacher. Most often, this is something like
 * a TTLCache from the `@isaacs/ttlcache` package or an lru-cache.
 */
export interface ILocalMemoryCache<TFields extends Record<string, any>> {
  /**
   * Gets a value from the cache for specified key.
   * @param key - key to get
   * @returns the cached value, or undefined if not present
   */
  get(key: string): LocalMemoryCacheValue<TFields> | undefined;

  /**
   * Sets a value in the cache for specified key.
   * @param key - key to set
   * @param value - value to set
   */
  set(key: string, value: LocalMemoryCacheValue<TFields>): void;

  /**
   * Deletes a value from the cache for specified key.
   * @param key - key to delete
   */
  delete(key: string): void;
}

export class GenericLocalMemoryCacher<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityGenericCacher<TFields, TIDField> {
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly localMemoryCache: ILocalMemoryCache<TFields>,
  ) {}

  static createNoOpCache<TFields extends Record<string, any>>(): ILocalMemoryCache<TFields> {
    return {
      get(_key: string): LocalMemoryCacheValue<TFields> | undefined {
        return undefined;
      },
      set(_key: string, _value: LocalMemoryCacheValue<TFields>): void {},
      delete(_key: string): void {},
    };
  }

  public async loadManyAsync(
    keys: readonly string[],
  ): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>> {
    const cacheResults = new Map<string, CacheLoadResult<TFields>>();
    for (const key of keys) {
      const cacheResult = this.localMemoryCache.get(key);
      if (cacheResult === DOES_NOT_EXIST_LOCAL_MEMORY_CACHE) {
        cacheResults.set(key, {
          status: CacheStatus.NEGATIVE,
        });
      } else if (cacheResult) {
        cacheResults.set(key, {
          status: CacheStatus.HIT,
          item: cacheResult as unknown as TFields,
        });
      } else {
        cacheResults.set(key, {
          status: CacheStatus.MISS,
        });
      }
    }
    return cacheResults;
  }

  public async cacheManyAsync(objectMap: ReadonlyMap<string, Readonly<TFields>>): Promise<void> {
    for (const [key, item] of objectMap) {
      this.localMemoryCache.set(key, item);
    }
  }

  public async cacheDBMissesAsync(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      this.localMemoryCache.set(key, DOES_NOT_EXIST_LOCAL_MEMORY_CACHE);
    }
  }

  public async invalidateManyAsync(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      this.localMemoryCache.delete(key);
    }
  }

  public makeCacheKeyForStorage<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue): string {
    const cacheKeyType = key.getLoadMethodType();
    const keyAndValueParts = key.createCacheKeyPartsForLoadValue(this.entityConfiguration, value);
    const parts = [
      this.entityConfiguration.tableName,
      cacheKeyType,
      `${this.entityConfiguration.cacheKeyVersion}`,
      ...keyAndValueParts,
    ];

    const delimiter = ':';
    const escapedParts = parts.map((part) =>
      part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`),
    );
    return escapedParts.join(delimiter);
  }

  public makeCacheKeysForInvalidation<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue): readonly string[] {
    // for local memory caches, we don't need to invalidate old versions of the cache keys
    // since they are not persisted across deploys
    return [this.makeCacheKeyForStorage(key, value)];
  }
}
