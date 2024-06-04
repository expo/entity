import invariant from 'invariant';

import EntityConfiguration from '../../EntityConfiguration';
import IEntityCacheAdapter from '../../IEntityCacheAdapter';
import IEntityCacheAdapterProvider from '../../IEntityCacheAdapterProvider';
import { CacheStatus, CacheLoadResult } from '../../internal/ReadThroughEntityCache';

export class NoCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  getCacheAdapter<TFields extends Record<string, any>>(
    _entityConfiguration: EntityConfiguration<TFields>
  ): IEntityCacheAdapter<TFields> {
    return new NoCacheStubCacheAdapter();
  }
}

export class NoCacheStubCacheAdapter<TFields> implements IEntityCacheAdapter<TFields> {
  public async loadManyAsync<N extends keyof TFields>(
    _fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    return fieldValues.reduce((acc: Map<NonNullable<TFields[N]>, CacheLoadResult<TFields>>, v) => {
      acc.set(v, {
        status: CacheStatus.MISS,
      });
      return acc;
    }, new Map());
  }

  public async cacheManyAsync<N extends keyof TFields>(
    _fieldName: N,
    _objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void> {}

  public async cacheDBMissesAsync<N extends keyof TFields>(
    _fieldName: N,
    _fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {}

  async invalidateManyAsync<N extends keyof TFields>(
    _fieldName: N,
    _fieldValues: readonly TFields[N][]
  ): Promise<void> {}
}

export class InMemoryFullCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  cache: Map<string, Readonly<object>> = new Map();

  getCacheAdapter<TFields extends Record<string, any>>(
    entityConfiguration: EntityConfiguration<TFields>
  ): IEntityCacheAdapter<TFields> {
    return new InMemoryFullCacheStubCacheAdapter(
      entityConfiguration,
      this.cache as Map<string, Readonly<TFields>>
    );
  }
}

export class InMemoryFullCacheStubCacheAdapter<TFields extends Record<string, any>>
  implements IEntityCacheAdapter<TFields>
{
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    readonly cache: Map<string, Readonly<TFields>>
  ) {}

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult<TFields>>> {
    const results = new Map<NonNullable<TFields[N]>, CacheLoadResult<TFields>>();
    fieldValues.forEach((fieldValue) => {
      const cacheKey = this.createCacheKey(fieldName, fieldValue);
      if (!this.cache.has(cacheKey)) {
        results.set(fieldValue, {
          status: CacheStatus.MISS,
        });
      } else {
        const objectForFieldValue = this.cache.get(cacheKey);
        invariant(objectForFieldValue !== undefined, 'should have set value for key');
        results.set(fieldValue, {
          status: CacheStatus.HIT,
          item: objectForFieldValue,
        });
      }
    });
    return results;
  }

  public async cacheManyAsync<N extends keyof TFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>
  ): Promise<void> {
    objectMap.forEach((obj, fieldValue) => {
      const cacheKey = this.createCacheKey(fieldName, fieldValue);
      this.cache.set(cacheKey, obj);
    });
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    _fieldName: N,
    _fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {}

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    fieldValues.forEach((fieldValue) => {
      const cacheKey = this.createCacheKey(fieldName, fieldValue);
      this.cache.delete(cacheKey);
    });
  }

  private createCacheKey<N extends keyof TFields>(fieldName: N, fieldValue: TFields[N]): string {
    return [
      this.entityConfiguration.tableName,
      `v${this.entityConfiguration.cacheKeyVersion}`,
      fieldName as string,
      String(fieldValue),
    ].join(':');
  }
}
