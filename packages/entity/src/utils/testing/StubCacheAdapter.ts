import invariant from 'invariant';

import EntityConfiguration, { EntityCompositeField } from '../../EntityConfiguration';
import IEntityCacheAdapter from '../../IEntityCacheAdapter';
import IEntityCacheAdapterProvider from '../../IEntityCacheAdapterProvider';
import {
  CompositeFieldValueHolder,
  CompositeFieldHolder,
} from '../../internal/CompositeFieldHolder';
import {
  CompositeFieldValueHolderMap,
  CompositeFieldValueHolderReadonlyMap,
} from '../../internal/CompositeFieldValueHolderMap';
import { CacheStatus, CacheLoadResult } from '../../internal/ReadThroughEntityCache';

export class NoCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  getCacheAdapter<TFields extends Record<string, any>>(
    _entityConfiguration: EntityConfiguration<TFields>,
  ): IEntityCacheAdapter<TFields> {
    return new NoCacheStubCacheAdapter();
  }
}

export class NoCacheStubCacheAdapter<TFields extends Record<string, any>>
  implements IEntityCacheAdapter<TFields>
{
  public async loadManyAsync<N extends keyof TFields>(
    _fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
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
    _objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>,
  ): Promise<void> {}

  public async cacheDBMissesAsync<N extends keyof TFields>(
    _fieldName: N,
    _fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {}

  public async invalidateManyAsync<N extends keyof TFields>(
    _fieldName: N,
    _fieldValues: readonly TFields[N][],
  ): Promise<void> {}

  public async loadManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    _compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<CompositeFieldValueHolderReadonlyMap<TFields, N, CacheLoadResult<TFields>>> {
    return compositeFieldValueHolders.reduce(
      (acc: CompositeFieldValueHolderMap<TFields, N, CacheLoadResult<TFields>>, v) => {
        acc.set(v, {
          status: CacheStatus.MISS,
        });
        return acc;
      },
      new CompositeFieldValueHolderMap<TFields, N, CacheLoadResult<TFields>>(),
    );
  }

  public async cacheManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    _compositeFieldHolder: CompositeFieldHolder<TFields>,
    _objectMap: CompositeFieldValueHolderReadonlyMap<TFields, N, Readonly<TFields>>,
  ): Promise<void> {}

  public async cacheCompositeFieldDBMissesAsync<N extends EntityCompositeField<TFields>>(
    _compositeFieldHolder: CompositeFieldHolder<TFields>,
    _compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {}

  public async invalidateManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    _compositeFieldHolder: CompositeFieldHolder<TFields>,
    _compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {}
}

export class InMemoryFullCacheStubCacheAdapterProvider implements IEntityCacheAdapterProvider {
  cache: Map<string, Readonly<object>> = new Map();

  getCacheAdapter<TFields extends Record<string, any>>(
    entityConfiguration: EntityConfiguration<TFields>,
  ): IEntityCacheAdapter<TFields> {
    return new InMemoryFullCacheStubCacheAdapter(
      entityConfiguration,
      this.cache as Map<string, Readonly<TFields>>,
    );
  }
}

export class InMemoryFullCacheStubCacheAdapter<TFields extends Record<string, any>>
  implements IEntityCacheAdapter<TFields>
{
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    readonly cache: Map<string, Readonly<TFields>>,
  ) {}

  public async loadManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
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
    objectMap: ReadonlyMap<NonNullable<TFields[N]>, Readonly<TFields>>,
  ): Promise<void> {
    objectMap.forEach((obj, fieldValue) => {
      const cacheKey = this.createCacheKey(fieldName, fieldValue);
      this.cache.set(cacheKey, obj);
    });
  }

  public async cacheDBMissesAsync<N extends keyof TFields>(
    _fieldName: N,
    _fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {}

  public async invalidateManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {
    fieldValues.forEach((fieldValue) => {
      const cacheKey = this.createCacheKey(fieldName, fieldValue);
      this.cache.delete(cacheKey);
    });
  }

  public async loadManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<CompositeFieldValueHolderReadonlyMap<TFields, N, CacheLoadResult<TFields>>> {
    const results = new CompositeFieldValueHolderMap<TFields, N, CacheLoadResult<TFields>>();
    compositeFieldValueHolders.forEach((compositeFieldValueHolder) => {
      const cacheKey = this.createCompositeCacheKey(
        compositeFieldHolder,
        compositeFieldValueHolder,
      );
      if (!this.cache.has(cacheKey)) {
        results.set(compositeFieldValueHolder, {
          status: CacheStatus.MISS,
        });
      } else {
        const objectForCompositeFieldValueHolder = this.cache.get(cacheKey);
        invariant(
          objectForCompositeFieldValueHolder !== undefined,
          'should have set value for key',
        );
        results.set(compositeFieldValueHolder, {
          status: CacheStatus.HIT,
          item: objectForCompositeFieldValueHolder,
        });
      }
    });
    return results;
  }

  public async cacheManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    objectMap: CompositeFieldValueHolderReadonlyMap<TFields, N, Readonly<TFields>>,
  ): Promise<void> {
    objectMap.forEach((obj, compositeFieldValueHolders) => {
      const cacheKey = this.createCompositeCacheKey(
        compositeFieldHolder,
        compositeFieldValueHolders,
      );
      this.cache.set(cacheKey, obj);
    });
  }

  public async cacheCompositeFieldDBMissesAsync<N extends EntityCompositeField<TFields>>(
    _compositeFieldHolder: CompositeFieldHolder<TFields>,
    _compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {}

  public async invalidateManyCompositeFieldAsync<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {
    compositeFieldValueHolders.forEach((compositeFieldValueHolder) => {
      const cacheKey = this.createCompositeCacheKey(
        compositeFieldHolder,
        compositeFieldValueHolder,
      );
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

  private createCompositeCacheKey<N extends EntityCompositeField<TFields>>(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: CompositeFieldValueHolder<TFields, N>,
  ): string {
    return [
      this.entityConfiguration.tableName,
      `v${this.entityConfiguration.cacheKeyVersion}`,
      compositeFieldHolder.serialize(),
      compositeFieldValueHolders.serialize(),
    ].join(':');
  }
}
