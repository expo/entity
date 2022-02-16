import { CacheStatus, ViewerContext } from '@expo/entity';
import { v4 as uuidv4 } from 'uuid';

import GenericLocalMemoryCacher from '../GenericLocalMemoryCacher';
import LocalMemoryCacheAdapter from '../LocalMemoryCacheAdapter';
import { LocalMemoryCacheAdapterProvider } from '../LocalMemoryCacheAdapterProvider';
import LocalMemoryTestEntity from '../testfixtures/LocalMemoryTestEntity';
import {
  createLocalMemoryIntegrationTestEntityCompanionProvider,
  createNoopLocalMemoryIntegrationTestEntityCompanionProvider,
} from '../testfixtures/createLocalMemoryIntegrationTestEntityCompanionProvider';

class TestViewerContext extends ViewerContext {}

describe(LocalMemoryCacheAdapter, () => {
  beforeEach(async () => {
    LocalMemoryCacheAdapterProvider.localMemoryCacheAdapterMap.clear();
  });

  it('has correct caching behavior', async () => {
    const viewerContext = new TestViewerContext(
      createLocalMemoryIntegrationTestEntityCompanionProvider()
    );
    const cacheAdapter = viewerContext.entityCompanionProvider.getCompanionForEntity(
      LocalMemoryTestEntity,
      LocalMemoryTestEntity.getCompanionDefinition()
    )['tableDataCoordinator']['cacheAdapter'];
    const cacheKeyMaker = cacheAdapter['makeCacheKey'].bind(cacheAdapter);

    const date = new Date();
    const entity1Created = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .enforceCreateAsync();

    // loading an entity should put it in cache
    const entity1 = await LocalMemoryTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());

    const entitySpecificGenericCacher =
      LocalMemoryCacheAdapterProvider.localMemoryCacheAdapterMap.get(
        LocalMemoryTestEntity.getCompanionDefinition().entityConfiguration.tableName
      )!['genericLocalMemoryCacher'];
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

    const entityNonExistentResult = await LocalMemoryTestEntity.loader(viewerContext).loadByIDAsync(
      nonExistentId
    );
    expect(entityNonExistentResult.ok).toBe(false);

    const nonExistentCachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', nonExistentId),
    ]);
    expect(nonExistentCachedResult.get(cacheKeyMaker('id', nonExistentId))).toMatchObject({
      status: CacheStatus.NEGATIVE,
    });

    // load again through entities framework to ensure it reads negative result
    const entityNonExistentResult2 = await LocalMemoryTestEntity.loader(
      viewerContext
    ).loadByIDAsync(nonExistentId);
    expect(entityNonExistentResult2.ok).toBe(false);

    // invalidate from cache to ensure it invalidates correctly
    await LocalMemoryTestEntity.loader(viewerContext).invalidateFieldsAsync(entity1.getAllFields());
    const cachedResultMiss = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', entity1.getID()),
    ]);
    const cachedValueMiss = cachedResultMiss.get(cacheKeyMaker('id', entity1.getID()));
    expect(cachedValueMiss).toMatchObject({ status: CacheStatus.MISS });
  });

  it('shares the cache between different requests', async () => {
    const genericLocalMemoryCacherLoadManySpy = jest.spyOn(
      GenericLocalMemoryCacher.prototype as unknown as any,
      'loadManyAsync'
    );
    const viewerContext = new TestViewerContext(
      createLocalMemoryIntegrationTestEntityCompanionProvider()
    );

    const date = new Date();
    const entity1Created = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .enforceCreateAsync();

    // loading an entity should put it in cache
    await LocalMemoryTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());

    // load entity with a different request
    const viewerContext2 = new TestViewerContext(
      createLocalMemoryIntegrationTestEntityCompanionProvider()
    );
    const entity1WithVc2 = await LocalMemoryTestEntity.loader(viewerContext2)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());

    const cacheAdapter = viewerContext.entityCompanionProvider.getCompanionForEntity(
      LocalMemoryTestEntity,
      LocalMemoryTestEntity.getCompanionDefinition()
    )['tableDataCoordinator']['cacheAdapter'];
    const cacheKeyMaker = cacheAdapter['makeCacheKey'].bind(cacheAdapter);
    expect(entity1WithVc2.getAllFields()).toMatchObject({
      id: entity1WithVc2.getID(),
      name: 'blah',
      dateField: date,
    });
    expect(genericLocalMemoryCacherLoadManySpy).toBeCalledWith([
      cacheKeyMaker('id', entity1WithVc2.getID()),
    ]);
    expect(genericLocalMemoryCacherLoadManySpy).toBeCalledTimes(2);
  });

  it('respects the parameters of a noop cache', async () => {
    const viewerContext = new TestViewerContext(
      createNoopLocalMemoryIntegrationTestEntityCompanionProvider()
    );
    const cacheAdapter = viewerContext.entityCompanionProvider.getCompanionForEntity(
      LocalMemoryTestEntity,
      LocalMemoryTestEntity.getCompanionDefinition()
    )['tableDataCoordinator']['cacheAdapter'];
    const cacheKeyMaker = cacheAdapter['makeCacheKey'].bind(cacheAdapter);

    const date = new Date();
    const entity1Created = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'blah')
      .setField('dateField', date)
      .enforceCreateAsync();

    // loading an entity will try to put it in cache but it's a noop cache, so it should be a miss
    const entity1 = await LocalMemoryTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1Created.getID());

    const entitySpecificGenericCacher =
      LocalMemoryCacheAdapterProvider.localMemoryCacheAdapterMap.get(
        LocalMemoryTestEntity.getCompanionDefinition().entityConfiguration.tableName
      )!['genericLocalMemoryCacher'];
    const cachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', entity1.getID()),
    ]);
    const cachedValue = cachedResult.get(cacheKeyMaker('id', entity1.getID()))!;
    expect(cachedValue).toMatchObject({
      status: CacheStatus.MISS,
    });

    // a non existent db fetch should try to write negative result ('') but it's a noop cache, so it should be a miss
    const nonExistentId = uuidv4();

    const entityNonExistentResult = await LocalMemoryTestEntity.loader(viewerContext).loadByIDAsync(
      nonExistentId
    );
    expect(entityNonExistentResult.ok).toBe(false);

    const nonExistentCachedResult = await entitySpecificGenericCacher.loadManyAsync([
      cacheKeyMaker('id', nonExistentId),
    ]);
    expect(nonExistentCachedResult.get(cacheKeyMaker('id', nonExistentId))).toMatchObject({
      status: CacheStatus.MISS,
    });
  });
});
