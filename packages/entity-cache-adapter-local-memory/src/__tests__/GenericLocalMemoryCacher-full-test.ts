import {
  GenericEntityCacheAdapter,
  IEntityGenericCacher,
  ViewerContext,
  CacheStatus,
} from '@expo/entity';
import { SingleFieldHolder, SingleFieldValueHolder } from '@expo/entity/internal';
import { describe, expect, it } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

import { GenericLocalMemoryCacher } from '../GenericLocalMemoryCacher';
import { LocalMemoryCacheAdapterProvider } from '../LocalMemoryCacheAdapterProvider';
import {
  LocalMemoryTestEntity,
  LocalMemoryTestEntityFields,
} from '../__testfixtures__/LocalMemoryTestEntity';
import {
  createLocalMemoryTestEntityCompanionProvider,
  createNoOpLocalMemoryIntegrationTestEntityCompanionProvider,
} from '../__testfixtures__/createLocalMemoryTestEntityCompanionProvider';

describe(GenericLocalMemoryCacher, () => {
  it('has correct caching behavior', async () => {
    const entityCompanionProvider = createLocalMemoryTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(entityCompanionProvider);
    const genericCacher = (
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)[
        'tableDataCoordinator'
      ]['cacheAdapter'] as GenericEntityCacheAdapter<LocalMemoryTestEntityFields, 'id'>
    )['genericCacher'];

    const date = new Date();
    const entity1Created = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .createAsync();

    // loading an entity should put it in cache
    const entity1 = await LocalMemoryTestEntity.loader(viewerContext).loadByIDAsync(
      entity1Created.getID(),
    );

    const localMemoryCacheAdapterProvider = entityCompanionProvider['cacheAdapterFlavors'].get(
      'local-memory',
    )!.cacheAdapterProvider as LocalMemoryCacheAdapterProvider;
    const entitySpecificGenericCacher = localMemoryCacheAdapterProvider[
      'localMemoryCacheAdapterMap'
    ].get(
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)
        .entityCompanionDefinition.entityConfiguration.tableName,
    )!['genericCacher'] as IEntityGenericCacher<LocalMemoryTestEntityFields, 'id'>;
    const cachedResult = await entitySpecificGenericCacher.loadManyAsync([
      genericCacher.makeCacheKeyForStorage(
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder(entity1.getID()),
      ),
    ]);
    const cachedValue = cachedResult.get(
      genericCacher.makeCacheKeyForStorage(
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder(entity1.getID()),
      ),
    )!;
    expect(cachedValue).toMatchObject({
      status: CacheStatus.HIT,
      item: {
        id: entity1.getID(),
        name: 'blah',
        dateField: date,
      },
    });

    // simulate non existent db fetch, should write negative result ('') to cache
    const nonExistentId = uuidv4();

    const entityNonExistentResult =
      await LocalMemoryTestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync(
        nonExistentId,
      );
    expect(entityNonExistentResult.ok).toBe(false);

    const nonExistentCachedResult = await entitySpecificGenericCacher.loadManyAsync([
      genericCacher.makeCacheKeyForStorage(
        new SingleFieldHolder('id'),
        new SingleFieldValueHolder(nonExistentId),
      ),
    ]);
    expect(
      nonExistentCachedResult.get(
        genericCacher.makeCacheKeyForStorage(
          new SingleFieldHolder('id'),
          new SingleFieldValueHolder(nonExistentId),
        ),
      ),
    ).toMatchObject({
      status: CacheStatus.NEGATIVE,
    });

    // load again through entities framework to ensure it reads negative result
    const entityNonExistentResult2 =
      await LocalMemoryTestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync(
        nonExistentId,
      );
    expect(entityNonExistentResult2.ok).toBe(false);

    // invalidate from cache to ensure it invalidates correctly
    await LocalMemoryTestEntity.invalidationUtils(viewerContext).invalidateFieldsAsync(
      entity1.getAllFields(),
    );
    const keys = genericCacher.makeCacheKeysForInvalidation(
      new SingleFieldHolder('id'),
      new SingleFieldValueHolder(entity1.getID()),
    );
    const cachedResultMiss = await entitySpecificGenericCacher.loadManyAsync(keys);
    expect(Array.from(cachedResultMiss.values()).every((v) => v.status === CacheStatus.MISS)).toBe(
      true,
    );
  });

  it('respects the parameters of a noop cache', async () => {
    const entityCompanionProvider = createNoOpLocalMemoryIntegrationTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(entityCompanionProvider);
    const genericCacher = (
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)[
        'tableDataCoordinator'
      ]['cacheAdapter'] as GenericEntityCacheAdapter<LocalMemoryTestEntityFields, 'id'>
    )['genericCacher'];
    const cacheKeyMaker = genericCacher['makeCacheKeyForStorage'].bind(genericCacher);

    const date = new Date();
    const entity1Created = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .createAsync();

    // loading an entity will try to put it in cache but it's a noop cache, so it should be a miss
    const entity1 = await LocalMemoryTestEntity.loader(viewerContext).loadByIDAsync(
      entity1Created.getID(),
    );

    const localMemoryCacheAdapterProvider = entityCompanionProvider['cacheAdapterFlavors'].get(
      'local-memory',
    )!.cacheAdapterProvider as LocalMemoryCacheAdapterProvider;
    const entitySpecificGenericCacher = localMemoryCacheAdapterProvider[
      'localMemoryCacheAdapterMap'
    ].get(
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)
        .entityCompanionDefinition.entityConfiguration.tableName,
    )!['genericCacher'] as IEntityGenericCacher<LocalMemoryTestEntityFields, 'id'>;
    const cachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker(new SingleFieldHolder('id'), new SingleFieldValueHolder(entity1.getID())),
    ]);
    const cachedValue = cachedResult.get(
      cacheKeyMaker(new SingleFieldHolder('id'), new SingleFieldValueHolder(entity1.getID())),
    )!;
    expect(cachedValue).toMatchObject({
      status: CacheStatus.MISS,
    });

    // a non existent db fetch should try to write negative result ('') but it's a noop cache, so it should be a miss
    const nonExistentId = uuidv4();

    const entityNonExistentResult =
      await LocalMemoryTestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync(
        nonExistentId,
      );
    expect(entityNonExistentResult.ok).toBe(false);

    const nonExistentCachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker(new SingleFieldHolder('id'), new SingleFieldValueHolder(nonExistentId)),
    ]);
    expect(
      nonExistentCachedResult.get(
        cacheKeyMaker(new SingleFieldHolder('id'), new SingleFieldValueHolder(nonExistentId)),
      ),
    ).toMatchObject({
      status: CacheStatus.MISS,
    });
  });
});
