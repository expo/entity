import invariant from 'invariant';

import EntityCacheAdapter from '../../EntityCacheAdapter';
import EntityConfiguration from '../../EntityConfiguration';
import IEntityCacheAdapterProvider from '../../IEntityCacheAdapterProvider';
import { FieldTransformerMap } from '../../internal/EntityFieldTransformationUtils';
import { CacheStatus, CacheLoadResult } from '../../internal/ReadThroughEntityCache';

export class NoCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  getCacheAdapter<TDatabaseFields>(
    entityConfiguration: EntityConfiguration<TDatabaseFields>
  ): EntityCacheAdapter<TDatabaseFields> {
    return new NoCacheStubCacheAdapter(entityConfiguration);
  }
}

export class NoCacheStubCacheAdapter<TDatabaseFields> extends EntityCacheAdapter<TDatabaseFields> {
  public getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  public async loadManyAsync<N extends keyof TDatabaseFields>(
    _fieldName: N,
    fieldValues: readonly NonNullable<TDatabaseFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TDatabaseFields[N]>, CacheLoadResult>> {
    return fieldValues.reduce((acc: Map<NonNullable<TDatabaseFields[N]>, CacheLoadResult>, v) => {
      acc.set(v, {
        status: CacheStatus.MISS,
      });
      return acc;
    }, new Map());
  }

  public async cacheManyAsync<N extends keyof TDatabaseFields>(
    _fieldName: N,
    _objectMap: ReadonlyMap<NonNullable<TDatabaseFields[N]>, object>
  ): Promise<void> {}

  public async cacheDBMissesAsync<N extends keyof TDatabaseFields>(
    _fieldName: N,
    _fieldValues: readonly NonNullable<TDatabaseFields[N]>[]
  ): Promise<void> {}

  async invalidateManyAsync<N extends keyof TDatabaseFields>(
    _fieldName: N,
    _fieldValues: readonly TDatabaseFields[N][]
  ): Promise<void> {}
}

export class InMemoryFullCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  cache: Map<string, Readonly<object>> = new Map();

  getCacheAdapter<TDatabaseFields>(
    entityConfiguration: EntityConfiguration<TDatabaseFields>
  ): EntityCacheAdapter<TDatabaseFields> {
    return new InMemoryFullCacheStubCacheAdapter(entityConfiguration, this.cache);
  }
}

class InMemoryFullCacheStubCacheAdapter<TDatabaseFields> extends EntityCacheAdapter<
  TDatabaseFields
> {
  constructor(
    entityConfiguration: EntityConfiguration<TDatabaseFields>,
    readonly cache: Map<string, Readonly<object>>
  ) {
    super(entityConfiguration);
  }

  public getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  public async loadManyAsync<N extends keyof TDatabaseFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TDatabaseFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TDatabaseFields[N]>, CacheLoadResult>> {
    const results = new Map<NonNullable<TDatabaseFields[N]>, CacheLoadResult>();
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

  public async cacheManyAsync<N extends keyof TDatabaseFields>(
    fieldName: N,
    objectMap: ReadonlyMap<NonNullable<TDatabaseFields[N]>, object>
  ): Promise<void> {
    objectMap.forEach((obj, fieldValue) => {
      const cacheKey = this.createCacheKey(fieldName, fieldValue);
      this.cache.set(cacheKey, obj);
    });
  }

  public async cacheDBMissesAsync<N extends keyof TDatabaseFields>(
    _fieldName: N,
    _fieldValues: readonly NonNullable<TDatabaseFields[N]>[]
  ): Promise<void> {}

  public async invalidateManyAsync<N extends keyof TDatabaseFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TDatabaseFields[N]>[]
  ): Promise<void> {
    fieldValues.forEach((fieldValue) => {
      const cacheKey = this.createCacheKey(fieldName, fieldValue);
      this.cache.delete(cacheKey);
    });
  }

  private createCacheKey<N extends keyof TDatabaseFields>(
    fieldName: N,
    fieldValue: TDatabaseFields[N]
  ): string {
    return `${fieldName}:::${fieldValue}`;
  }
}
