import invariant from 'invariant';

import EntityCacheAdapter from '../../EntityCacheAdapter';
import EntityConfiguration from '../../EntityConfiguration';
import IEntityCacheAdapterProvider from '../../IEntityCacheAdapterProvider';
import { FieldTransformerMap } from '../../internal/EntityFieldTransformationUtils';
import { CacheStatus, CacheLoadResult } from '../../internal/ReadThroughEntityCache';

export class NoCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  getCacheAdapter<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityCacheAdapter<TFields> {
    return new NoCacheStubCacheAdapter(entityConfiguration);
  }
}

export class NoCacheStubCacheAdapter<TFields> extends EntityCacheAdapter<TFields> {
  public getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  public async loadManyAsync<N extends keyof TFields>(
    _fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult>> {
    return fieldValues.reduce((acc: Map<NonNullable<TFields[N]>, CacheLoadResult>, v) => {
      acc.set(v, {
        status: CacheStatus.MISS,
      });
      return acc;
    }, new Map());
  }

  public async cacheManyAsync<N extends keyof TFields>(
    _fieldName: N,
    _objectMap: ReadonlyMap<NonNullable<TFields[N]>, object>
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

  getCacheAdapter<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityCacheAdapter<TFields> {
    return new InMemoryFullCacheStubCacheAdapter(entityConfiguration, this.cache);
  }
}

export class InMemoryFullCacheStubCacheAdapter<TFields> extends EntityCacheAdapter<TFields> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields>,
    readonly cache: Map<string, Readonly<object>>
  ) {
    super(entityConfiguration);
  }

  public getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, CacheLoadResult>> {
    const results = new Map<NonNullable<TFields[N]>, CacheLoadResult>();
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
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, object>
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

  private createCacheKey<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): string {
    return this.getCacheKeyParts(fieldName, fieldValue).join(':');
  }
}
