import invariant from 'invariant';

import { EntityConfiguration } from '../../EntityConfiguration';
import { IEntityCacheAdapter } from '../../IEntityCacheAdapter';
import { IEntityCacheAdapterProvider } from '../../IEntityCacheAdapterProvider';
import { IEntityLoadKey, IEntityLoadValue } from '../../internal/EntityLoadInterfaces';
import { CacheLoadResult, CacheStatus } from '../../internal/ReadThroughEntityCache';

export class NoCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  getCacheAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    _entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): IEntityCacheAdapter<TFields, TIDField> {
    return new NoCacheStubCacheAdapter();
  }
}

export class NoCacheStubCacheAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityCacheAdapter<TFields, TIDField> {
  public async loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>> {
    return values.reduce((acc: Map<TLoadValue, CacheLoadResult<TFields>>, v) => {
      acc.set(v, {
        status: CacheStatus.MISS,
      });
      return acc;
    }, key.vendNewLoadValueMap<CacheLoadResult<TFields>>());
  }

  public async cacheManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(_key: TLoadKey, _objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>): Promise<void> {}

  public async cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(_key: TLoadKey, _values: readonly TLoadValue[]): Promise<void> {}

  public async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(_key: TLoadKey, _values: readonly TLoadValue[]): Promise<void> {}
}

// Sentinel value we store in the in-memory cache to negatively cache a database miss.
// The sentinel value is distinct from any (positively) cached value.
export const DOES_NOT_EXIST = Symbol('inMemoryCacheDoesNotExistValue');

export class InMemoryFullCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  private readonly cache: Map<string, Readonly<object> | typeof DOES_NOT_EXIST> = new Map();

  getCacheAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): IEntityCacheAdapter<TFields, TIDField> {
    return new InMemoryFullCacheStubCacheAdapter(
      entityConfiguration,
      this.cache as Map<string, Readonly<TFields>>,
    );
  }
}

export class InMemoryFullCacheStubCacheAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityCacheAdapter<TFields, TIDField> {
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly cache: Map<string, Readonly<TFields> | typeof DOES_NOT_EXIST>,
  ) {}

  public async loadManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, CacheLoadResult<TFields>>> {
    const results = key.vendNewLoadValueMap<CacheLoadResult<TFields>>();
    values.forEach((value) => {
      const cacheKey = this.createCacheKey(key, value);
      if (!this.cache.has(cacheKey)) {
        results.set(value, {
          status: CacheStatus.MISS,
        });
      } else {
        const objectForFieldValue = this.cache.get(cacheKey);
        invariant(objectForFieldValue !== undefined, 'should have set value for key');
        if (objectForFieldValue === DOES_NOT_EXIST) {
          results.set(value, {
            status: CacheStatus.NEGATIVE,
          });
        } else {
          results.set(value, {
            status: CacheStatus.HIT,
            item: objectForFieldValue,
          });
        }
      }
    });
    return results;
  }

  public async cacheManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, objectMap: ReadonlyMap<TLoadValue, Readonly<TFields>>): Promise<void> {
    objectMap.forEach((obj, value) => {
      const cacheKey = this.createCacheKey(key, value);
      this.cache.set(cacheKey, obj);
    });
  }

  public async cacheDBMissesAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    values.forEach((value) => {
      const cacheKey = this.createCacheKey(key, value);
      this.cache.set(cacheKey, DOES_NOT_EXIST);
    });
  }

  public async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    values.forEach((value) => {
      const cacheKey = this.createCacheKey(key, value);
      this.cache.delete(cacheKey);
    });
  }

  private createCacheKey<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue): string {
    const cacheKeyType = key.getLoadMethodType();
    const parts = key.createCacheKeyPartsForLoadValue(this.entityConfiguration, value);
    return [
      this.entityConfiguration.tableName,
      cacheKeyType,
      `v${this.entityConfiguration.cacheKeyVersion}`,
      ...parts,
    ].join(':');
  }
}
