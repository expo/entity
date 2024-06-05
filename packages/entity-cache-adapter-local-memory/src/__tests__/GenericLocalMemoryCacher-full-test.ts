import {
  CacheAdapterFlavor,
  CacheAdapterFlavorDefinition,
  CacheStatus,
  ViewerContext,
} from '@expo/entity';
import { v4 as uuidv4 } from 'uuid';

import GenericLocalMemoryCacher from '../GenericLocalMemoryCacher';
import LocalMemoryCacheAdapterProvider from '../LocalMemoryCacheAdapterProvider';
import LocalMemoryTestEntity from '../testfixtures/LocalMemoryTestEntity';
import {
  createLocalMemoryTestEntityCompanionProvider,
  createNoOpLocalMemoryIntegrationTestEntityCompanionProvider,
} from '../testfixtures/createLocalMemoryTestEntityCompanionProvider';

describe(GenericLocalMemoryCacher, () => {
  it('has correct caching behavior', async () => {
    const entityCompanionProvider = createLocalMemoryTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(entityCompanionProvider);
    const genericCacher =
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)[
        'tableDataCoordinator'
      ]['cacheAdapter']['genericCacher'];
    const cacheKeyMaker = genericCacher['makeCacheKey'].bind(genericCacher);

    const date = new Date();
    const entity1Created = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .enforceCreateAsync();

    // loading an entity should put it in cache
    const entity1 = await LocalMemoryTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());

    const localMemoryCacheAdapterProvider = (
      entityCompanionProvider['cacheAdapterFlavors'] as ReadonlyMap<
        CacheAdapterFlavor,
        CacheAdapterFlavorDefinition
      >
    ).get('local-memory')!.cacheAdapterProvider as LocalMemoryCacheAdapterProvider;
    const entitySpecificGenericCacher = localMemoryCacheAdapterProvider[
      'localMemoryCacheAdapterMap'
    ].get(
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)
        .entityCompanionDefinition.entityConfiguration.tableName,
    )!['genericCacher'];
    const cachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', entity1.getID()),
    ]);
    const cachedValue = cachedResult.get(cacheKeyMaker('id', entity1.getID()))!;
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

    const entityNonExistentResult = await LocalMemoryTestEntity.loader(viewerContext)
      .withAuthorizationResults()
      .loadByIDAsync(nonExistentId);
    expect(entityNonExistentResult.ok).toBe(false);

    const nonExistentCachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', nonExistentId),
    ]);
    expect(nonExistentCachedResult.get(cacheKeyMaker('id', nonExistentId))).toMatchObject({
      status: CacheStatus.NEGATIVE,
    });

    // load again through entities framework to ensure it reads negative result
    const entityNonExistentResult2 = await LocalMemoryTestEntity.loader(viewerContext)
      .withAuthorizationResults()
      .loadByIDAsync(nonExistentId);
    expect(entityNonExistentResult2.ok).toBe(false);

    // invalidate from cache to ensure it invalidates correctly
    await LocalMemoryTestEntity.loader(viewerContext)
      .utils()
      .invalidateFieldsAsync(entity1.getAllFields());
    const cachedResultMiss = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', entity1.getID()),
    ]);
    const cachedValueMiss = cachedResultMiss.get(cacheKeyMaker('id', entity1.getID()));
    expect(cachedValueMiss).toMatchObject({ status: CacheStatus.MISS });
  });

  it('respects the parameters of a noop cache', async () => {
    const entityCompanionProvider = createNoOpLocalMemoryIntegrationTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(entityCompanionProvider);
    const genericCacher =
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)[
        'tableDataCoordinator'
      ]['cacheAdapter']['genericCacher'];
    const cacheKeyMaker = genericCacher['makeCacheKey'].bind(genericCacher);

    const date = new Date();
    const entity1Created = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .enforceCreateAsync();

    // loading an entity will try to put it in cache but it's a noop cache, so it should be a miss
    const entity1 = await LocalMemoryTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());

    const localMemoryCacheAdapterProvider = (
      entityCompanionProvider['cacheAdapterFlavors'] as ReadonlyMap<
        CacheAdapterFlavor,
        CacheAdapterFlavorDefinition
      >
    ).get('local-memory')!.cacheAdapterProvider as LocalMemoryCacheAdapterProvider;
    const entitySpecificGenericCacher = localMemoryCacheAdapterProvider[
      'localMemoryCacheAdapterMap'
    ].get(
      viewerContext.entityCompanionProvider.getCompanionForEntity(LocalMemoryTestEntity)
        .entityCompanionDefinition.entityConfiguration.tableName,
    )!['genericCacher'];
    const cachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', entity1.getID()),
    ]);
    const cachedValue = cachedResult.get(cacheKeyMaker('id', entity1.getID()))!;
    expect(cachedValue).toMatchObject({
      status: CacheStatus.MISS,
    });

    // a non existent db fetch should try to write negative result ('') but it's a noop cache, so it should be a miss
    const nonExistentId = uuidv4();

    const entityNonExistentResult = await LocalMemoryTestEntity.loader(viewerContext)
      .withAuthorizationResults()
      .loadByIDAsync(nonExistentId);
    expect(entityNonExistentResult.ok).toBe(false);

    const nonExistentCachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', nonExistentId),
    ]);
    expect(nonExistentCachedResult.get(cacheKeyMaker('id', nonExistentId))).toMatchObject({
      status: CacheStatus.MISS,
    });
  });
});
