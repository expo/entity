import { describe, it, expect } from '@jest/globals';
import nullthrows from 'nullthrows';

import { AuthorizationResultBasedEntityLoader } from '../AuthorizationResultBasedEntityLoader';
import { EntityConstructionUtils } from '../EntityConstructionUtils';
import { EntitySecondaryCacheLoader } from '../EntitySecondaryCacheLoader';
import { GenericSecondaryEntityCache } from '../GenericSecondaryEntityCache';
import { IEntityGenericCacher } from '../IEntityGenericCacher';
import { ViewerContext } from '../ViewerContext';
import { IEntityLoadKey, IEntityLoadValue } from '../internal/EntityLoadInterfaces';
import { CacheLoadResult, CacheStatus } from '../internal/ReadThroughEntityCache';
import {
  TestEntity,
  TestEntityPrivacyPolicy,
  TestFields,
} from '../utils/__testfixtures__/TestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';
import { mapMapAsync } from '../utils/collections/maps';

type TestLoadParams = { intValue: number };

const DOES_NOT_EXIST = Symbol('doesNotExist');

class TestGenericCacher implements IEntityGenericCacher<TestFields, 'customIdField'> {
  private readonly localMemoryCache = new Map<
    string,
    Readonly<TestFields> | typeof DOES_NOT_EXIST
  >();

  public async loadManyAsync(
    keys: readonly string[],
  ): Promise<ReadonlyMap<string, CacheLoadResult<TestFields>>> {
    const cacheResults = new Map<string, CacheLoadResult<TestFields>>();
    for (const key of keys) {
      const cacheResult = this.localMemoryCache.get(key);
      if (cacheResult === DOES_NOT_EXIST) {
        cacheResults.set(key, {
          status: CacheStatus.NEGATIVE,
        });
      } else if (cacheResult) {
        cacheResults.set(key, {
          status: CacheStatus.HIT,
          item: cacheResult as unknown as TestFields,
        });
      } else {
        cacheResults.set(key, {
          status: CacheStatus.MISS,
        });
      }
    }
    return cacheResults;
  }

  public async cacheManyAsync(objectMap: ReadonlyMap<string, Readonly<TestFields>>): Promise<void> {
    for (const [key, item] of objectMap) {
      this.localMemoryCache.set(key, item);
    }
  }

  public async cacheDBMissesAsync(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      this.localMemoryCache.set(key, DOES_NOT_EXIST);
    }
  }

  public async invalidateManyAsync(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      this.localMemoryCache.delete(key);
    }
  }

  makeCacheKeyForStorage<
    TLoadKey extends IEntityLoadKey<TestFields, 'customIdField', TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(_key: TLoadKey, _value: TLoadValue): string {
    throw new Error('Method not used by this test.');
  }

  makeCacheKeysForInvalidation<
    TLoadKey extends IEntityLoadKey<TestFields, 'customIdField', TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(_key: TLoadKey, _value: TLoadValue): readonly string[] {
    throw new Error('Method not used by this test.');
  }
}

class TestSecondaryEntityCache<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
  TLoadParams,
> extends GenericSecondaryEntityCache<TFields, TIDField, TLoadParams> {}

class TestSecondaryCacheLoader extends EntitySecondaryCacheLoader<
  TestLoadParams,
  TestFields,
  'customIdField',
  ViewerContext,
  TestEntity,
  TestEntityPrivacyPolicy
> {
  public databaseLoadCount = 0;

  constructor(
    secondaryEntityCache: TestSecondaryEntityCache<TestFields, 'customIdField', TestLoadParams>,
    constructionUtils: EntityConstructionUtils<
      TestFields,
      'customIdField',
      ViewerContext,
      TestEntity,
      TestEntityPrivacyPolicy,
      keyof TestFields
    >,
    private readonly entityLoader: AuthorizationResultBasedEntityLoader<
      TestFields,
      'customIdField',
      ViewerContext,
      TestEntity,
      TestEntityPrivacyPolicy,
      keyof TestFields
    >,
  ) {
    super(secondaryEntityCache, constructionUtils);
  }

  protected override async fetchObjectsFromDatabaseAsync(
    loadParamsArray: readonly Readonly<TestLoadParams>[],
  ): Promise<ReadonlyMap<Readonly<Readonly<TestLoadParams>>, Readonly<TestFields> | null>> {
    this.databaseLoadCount += loadParamsArray.length;

    const emptyMap = new Map(loadParamsArray.map((p) => [p, null]));
    return await mapMapAsync(emptyMap, async (_value, loadParams) => {
      return (
        (await this.entityLoader.loadManyByFieldEqualingAsync('intField', loadParams.intValue))[0]
          ?.enforceValue()
          ?.getAllFields() ?? null
      );
    });
  }
}

describe(GenericSecondaryEntityCache, () => {
  it('Loads through secondary loader, caches, and invalidates', async () => {
    const viewerContext = new ViewerContext(createUnitTestEntityCompanionProvider());

    const createdEntity = await TestEntity.creator(viewerContext)
      .setField('intField', 1)
      .createAsync();

    const secondaryCacheLoader = new TestSecondaryCacheLoader(
      new TestSecondaryEntityCache(
        new TestGenericCacher(),
        (params) => `intValue.${params.intValue}`,
      ),
      EntitySecondaryCacheLoader.getConstructionUtilsForEntityClass(TestEntity, viewerContext),
      TestEntity.loaderWithAuthorizationResults(viewerContext),
    );

    const loadParams = { intValue: 1 };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(1);

    const results2 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results2.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(1);

    await secondaryCacheLoader.invalidateManyAsync([loadParams]);

    const results3 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results3.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(2);
  });

  it('correctly handles uncached and unfetchable load params', async () => {
    const viewerContext = new ViewerContext(createUnitTestEntityCompanionProvider());

    const secondaryCacheLoader = new TestSecondaryCacheLoader(
      new TestSecondaryEntityCache(
        new TestGenericCacher(),
        (params) => `intValue.${params.intValue}`,
      ),
      EntitySecondaryCacheLoader.getConstructionUtilsForEntityClass(TestEntity, viewerContext),
      TestEntity.loaderWithAuthorizationResults(viewerContext),
    );

    const loadParams = { intValue: 2 };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(results.size).toBe(1);
    expect(results.get(loadParams)).toBe(null);
  });
});
