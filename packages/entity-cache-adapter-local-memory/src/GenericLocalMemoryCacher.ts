import {
  CacheLoadResult,
  CacheStatus,
  EntityConfiguration,
  IEntityGenericCacher,
  IEntityLoadKey,
  IEntityLoadValue,
} from '@expo/entity';
import LRUCache from 'lru-cache';

// Sentinel value we store in local memory to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
export const DOES_NOT_EXIST_LOCAL_MEMORY_CACHE = Symbol('doesNotExist');
export type LocalMemoryCacheValue<TFields extends Record<string, any>> =
  | Readonly<TFields>
  | typeof DOES_NOT_EXIST_LOCAL_MEMORY_CACHE;
export type LocalMemoryCache<TFields extends Record<string, any>> = LRUCache<
  string,
  LocalMemoryCacheValue<TFields>
>;

export default class GenericLocalMemoryCacher<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityGenericCacher<TFields, TIDField>
{
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly localMemoryCache: LocalMemoryCache<TFields>,
  ) {}

  static createLRUCache<TFields extends Record<string, any>>(
    options: { maxSize?: number; ttlSeconds?: number } = {},
  ): LocalMemoryCache<TFields> {
    const DEFAULT_LRU_CACHE_MAX_AGE_SECONDS = 10;
    const DEFAULT_LRU_CACHE_SIZE = 10000;
    const maxAgeSeconds = options.ttlSeconds ?? DEFAULT_LRU_CACHE_MAX_AGE_SECONDS;
    return new LRUCache<string, LocalMemoryCacheValue<TFields>>({
      max: options.maxSize ?? DEFAULT_LRU_CACHE_SIZE,
      length: (value) => (value === DOES_NOT_EXIST_LOCAL_MEMORY_CACHE ? 0 : 1),
      maxAge: maxAgeSeconds * 1000, // convert to ms
    });
  }

  static createNoOpCache<TFields extends Record<string, any>>(): LocalMemoryCache<TFields> {
    return new LRUCache<string, LocalMemoryCacheValue<TFields>>({
      max: 0,
      maxAge: -1,
    });
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
      this.localMemoryCache.del(key);
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
